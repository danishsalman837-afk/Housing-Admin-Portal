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

    Object.entries(lead).forEach(([key, value]) => {
      if (value !== null && value !== '') {
        const titleKey = key.replace(/_/g, ' ').toUpperCase();
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${titleKey}: `, bold: true, color: "1E293B" }),
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
