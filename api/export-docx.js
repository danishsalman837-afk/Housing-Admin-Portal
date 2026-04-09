const { createSupabaseClient, assertEnv } = require("./_supabaseClient");
const docx = require("docx");
const {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType,
  ShadingType, convertInchesToTwip, ImageRun
} = docx;
const axios = require("axios");

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { id, token, anonymize } = req.query;
    if (!id && !token) return res.status(400).json({ error: "Missing Lead ID or Token" });

    if (!assertEnv('service', res)) return;
    const supabase = createSupabaseClient('service');

    let lead;
    let isAnonymized = anonymize === 'true';

    if (token) {
      const { data, error } = await supabase.from('submissions').select('*').eq('unique_token', token).single();
      if (error || !data) return res.status(404).json({ error: "Lead not found" });
      lead = data;
      
      // Check if accepted to decide on anonymization
      const { data: activities } = await supabase.from('solicitor_activity').select('status').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1);
      const status = (activities && activities[0]) ? activities[0].status : 'New';
      if (status !== 'Accepted') isAnonymized = true;
    } else {
      const { data, error } = await supabase.from('submissions').select('*').eq('id', id).single();
      if (error || !lead) {
        if (!data) return res.status(404).json({ error: "Lead not found" });
        lead = data;
      }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    const val = (key, fallbacks = []) => {
      let v = lead[key];
      if ((v === null || v === undefined || v === '') && fallbacks.length) {
        for (const fb of fallbacks) { v = lead[fb]; if (v !== null && v !== undefined && v !== '') break; }
      }
      return (v !== null && v !== undefined && v !== '') ? String(v) : '—';
    };

    const DARK_BLUE = "1A3A52";
    const MID_BLUE = "0066CC";
    const SLATE = "475569";
    const LIGHT_BG = "F0F7FF";
    const WHITE = "FFFFFF";
    const BORDER_COLOR = "CBD5E1";

    // Section heading paragraph
    const sectionHeading = (text) => new Paragraph({
      children: [
        new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: WHITE, font: "Calibri" })
      ],
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.LEFT,
      shading: { type: ShadingType.SOLID, color: DARK_BLUE },
      spacing: { before: 340, after: 80 },
      indent: { left: convertInchesToTwip(0.12) }
    });

    // Q → A row using a 2-col table for clean alignment
    const qaRow = (question, answer) => new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideH: { style: BorderStyle.NONE },
        insideV: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            // Question cell
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: LIGHT_BG },
              margins: { top: 80, bottom: 80, left: 140, right: 80 },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: question, bold: true, size: 20, color: SLATE, font: "Calibri" })],
                  spacing: { after: 0 }
                })
              ]
            }),
            // Answer cell
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 140, right: 80 },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: answer, size: 20, bold: true, color: DARK_BLUE, font: "Calibri" })],
                  spacing: { after: 0 }
                })
              ]
            })
          ]
        })
      ]
    });

    const spacer = (pts = 100) => new Paragraph({ text: "", spacing: { before: pts, after: 0 } });

    // ─── Build Document ──────────────────────────────────────────────────────

    const children = [];

    // ── Title ──
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "HOUSING DISREPAIR FORM", bold: true, size: 40, color: WHITE, font: "Calibri" })
        ],
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: MID_BLUE },
        spacing: { before: 0, after: 0 },
        indent: { left: convertInchesToTwip(0), right: convertInchesToTwip(0) }
      })
    );

    // ── Section 1: Contact Details ──
    children.push(sectionHeading("Section 1 — CONTACT DETAILS"), spacer(60));
    children.push(qaRow("Name", val('name')));
    children.push(qaRow("Email Address", isAnonymized ? '••••••••@••••.com' : val('email')));
    children.push(qaRow("Phone Number", isAnonymized ? '•••• ••• ••••' : val('phone')));
    children.push(qaRow("Date of Birth (DOB)", isAnonymized ? '••/••/••••' : val('dob', ['dateOfBirth', 'date_of_birth'])));
    children.push(qaRow("Address", isAnonymized ? '••••••••••••••••••••' : val('address')));
    children.push(qaRow("Postcode", val('postcode')));
    children.push(qaRow("Are you a council tenant or a housing association tenant?", val('tenantType', ['tenant_type'])));
    children.push(qaRow("Name of Landlord", val('landlordName', ['landlord_name'])));
    children.push(qaRow("How long have you been living in the property?", val('livingDuration', ['tenancyDuration', 'living_duration'])));

    // ── Section 2: Damp / Mould ──
    children.push(spacer(160), sectionHeading("Section 2 — Damp / Mould"), spacer(60));
    children.push(qaRow("Is there any damp or mould in the property?", val('damp', ['hasDampMould'])));
    children.push(qaRow("Where exactly is the damp or mould located?", val('dampLocation')));
    children.push(qaRow("How many rooms are affected?", val('dampRooms', ['roomsAffected'])));
    children.push(qaRow("Is it on the walls, ceiling, or floor?", val('dampSurface', ['affectedSurface'])));
    children.push(qaRow("How long have you had this issue?", val('dampDuration', ['issueDuration'])));
    children.push(qaRow("Do you know what caused it (leak, rain, pipe, roof)?", val('dampCause', ['issueCause'])));
    children.push(qaRow("Has it damaged any belongings (bed, sofa, clothes, etc.)?", val('dampDamage', ['damageBelongings'])));
    children.push(qaRow("Has it caused any health problems (breathing, asthma, allergies, skin issues)?", val('dampHealth', ['healthProblems'])));

    // ── Section 3: Leaks ──
    children.push(spacer(160), sectionHeading("Section 3 — Leaks"), spacer(60));
    children.push(qaRow("Do you have any leaks in the property?", val('leak', ['hasLeaks'])));
    children.push(qaRow("Where is the leak coming from?", val('leakLocation')));
    children.push(qaRow("Is it from the roof, ceiling, pipe, bathroom, or kitchen?", val('leakSource')));
    children.push(qaRow("When did the leak start? Is it still ongoing?", val('leakStart')));
    children.push(qaRow("Has it caused damage to walls, ceiling, or floor?", val('leakDamage')));
    children.push(qaRow("Any cracks or structural damage?", val('leakCracks', ['cracksDamage'])));
    children.push(qaRow("Has it damaged your belongings?", val('leakBelongings')));

    // ── Section 4: Other Issues ──
    children.push(spacer(160), sectionHeading("Section 4 — Other Property Issues"), spacer(60));
    children.push(qaRow("Are there any Faulty Electrics in the property?", val('issues_electrics', ['faultyElectrics'])));
    children.push(qaRow("Are there any Heating / Boiler Issues?", val('issues_heating', ['heatingIssues'])));
    children.push(qaRow("Are there any Cracks or Structural Damages?", val('issues_structural', ['structuralDamage'])));

    // ── Section 5: Reporting ──
    children.push(spacer(160), sectionHeading("Section 5 — Reporting to Landlord"), spacer(60));
    children.push(qaRow("Have you reported all the disrepairs over a month ago and have no date for it to be fixed?", val('reported', ['reportedOverMonth'])));
    children.push(qaRow("How many times have you notified your landlord? Was it through email, text, or calls?", val('reportCount')));
    children.push(qaRow("When did you first report the issue?", val('reportFirst')));
    children.push(qaRow("When did you last report to the landlord about the disrepair?", val('reportLast')));
    children.push(qaRow("Did the landlord or council respond?", val('reportResponse')));
    children.push(qaRow("Did they attempt any repairs?", val('reportAttempt')));
    children.push(qaRow("Is the issue still not resolved?", val('reportStatus')));

    // ── Section 6: Rental Arrears ──
    children.push(spacer(160), sectionHeading("Section 6 — Rental Arrears"), spacer(60));
    children.push(qaRow("Are you in rental arrears? (Must be less than £1000)", val('arrears', ['rentalArrears'])));
    children.push(qaRow("If YES – confirm amount:", val('arrearsAmount')));
    children.push(qaRow("Have you already submitted a housing disrepair claim?", val('alreadySubmitted')));

    // ── Section 7: Additional Notes ──
    children.push(spacer(160), sectionHeading("Section 7 — Additional Notes"), spacer(60));
    children.push(qaRow("Additional Notes", val('additionalNotes')));

    // ── Section 8: Visual Evidence ──
    const attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
    if (attachments.length > 0) {
      children.push(spacer(160), sectionHeading("Section 8 — Photo Evidence"), spacer(80));
      
      for (const attach of attachments) {
        try {
          const response = await axios.get(attach.url, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');
          
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: { width: 500, height: 350 },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            }),
            new Paragraph({
              children: [new TextRun({ text: `File: ${attach.name}`, size: 16, color: SLATE, italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            })
          );
        } catch (e) {
          console.error("Failed to include image:", attach.url, e.message);
          children.push(new Paragraph({ text: `[Error loading image: ${attach.name}]`, spacing: { before: 100, after: 100 } }));
        }
      }
    }

    // ── Footer note ──
    children.push(
      spacer(300),
      new Paragraph({
        children: [
          new TextRun({ text: `Generated: ${new Date().toLocaleString('en-GB')}   |   Ref ID: ${lead.id}`, size: 16, color: "94A3B8", italics: true, font: "Calibri" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 }
      })
    );

    // ─── Pack & Send ─────────────────────────────────────────────────────────

    const doc = new Document({
      creator: "Housing Admin Portal",
      title: `Lead - ${lead.name || lead.id}`,
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9)
            }
          }
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const safeName = (lead.name || 'Lead').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="HousingDisrepair_${safeName}.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error generating Document: " + err.message });
  }
};
