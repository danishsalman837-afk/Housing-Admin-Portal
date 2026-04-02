const { createSupabaseClient, assertEnv } = require("./supabaseClient");
const docx = require("docx");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing Lead ID" });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const { data: lead, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !lead) return res.status(404).json({ error: "Lead not found" });

    // Generate paragraphs for each property
    const paragraphs = [
      new Paragraph({
        text: `Lead Details: ${lead.name || 'Unknown'}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      })
    ];

    const leadViewOrder = [
      'name', 'phone', 'email', 'dateOfBirth', 'address', 'postcode',
      'tenantType', 'livingDuration', 
      'damp', 'damplocation', 'damprooms', 'dampsurface',
      'leak', 'leaklocation', 'leaksource', 'leakdamage',
      'heatingmainissue', 'structurallocation',
      'reported', 'reportcount', 'reportfirst', 'reportresponse', 'reportattempt', 'reportstatus'
    ];

    const leadFieldLabels = {
      name: 'Name',
      phone: 'Phone Number',
      email: 'Email Address',
      dateOfBirth: 'Date of Birth (DOB)',
      address: 'Address',
      postcode: 'Postcode',
      tenantType: 'Tenant Type',
      livingDuration: 'Living Duration',
      damp: 'Damp',
      damplocation: 'Damp Location',
      damprooms: 'Damp Rooms',
      dampsurface: 'Damp Surface',
      leak: 'Leak',
      leaklocation: 'Leak Location',
      leaksource: 'Leak Source',
      leakdamage: 'Leak Damage',
      heatingmainissue: 'Heating Main Issue',
      structurallocation: 'Structural Location',
      reported: 'Reported',
      reportcount: 'Report Count',
      reportfirst: 'Report First',
      reportresponse: 'Report Response',
      reportattempt: 'Report Attempt',
      reportstatus: 'Report Status'
    };

    leadViewOrder.forEach(key => {
      let value = lead[key];
      
      // Fallbacks
      if (value === undefined || value === null) {
        if (key === 'dateOfBirth') value = lead.dob || lead.birthDate || lead.date_of_birth;
        if (key === 'tenantType') value = lead.tenant_type || lead.councilTenant || lead.housingAssociation;
        if (key === 'livingDuration') value = lead.tenancyDuration || lead.living_duration;
        if (key === 'damp') value = lead.hasDampMould;
      }

      if (value !== null && value !== undefined && value !== '') {
        const label = leadFieldLabels[key] || key.replace(/_/g, ' ').toUpperCase();
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true, color: "1E293B" }),
              new TextRun({ text: String(value) })
            ],
            spacing: { after: 200 }
          })
        );
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="Lead_${lead.id}.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error generating Document" });
  }
};
