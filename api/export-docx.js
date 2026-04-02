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

    const systemFields = ['id', 'created_at', 'timestamp', 'notes', 'leadStatus', 'assigned_company_id', 'assigned_solicitor_id', 'member_id', 'active'];

    // 1. First append all fields in the desired order
    const processedKeys = new Set();
    
    leadViewOrder.forEach(key => {
      let value = lead[key];
      processedKeys.add(key);
      
      // Fallbacks
      if (value === undefined || value === null || value === '') {
        if (key === 'dateOfBirth') value = lead.dob || lead.birthDate || lead.date_of_birth;
        else if (key === 'tenantType') value = lead.tenant_type || lead.councilTenant || lead.housingAssociation;
        else if (key === 'livingDuration') value = lead.tenancyDuration || lead.living_duration;
        else if (key === 'damp') value = lead.hasDampMould;
      }

      if (value !== null && value !== undefined && value !== '') {
        processedKeys.add('dob'); processedKeys.add('birthDate'); processedKeys.add('date_of_birth');
        processedKeys.add('tenant_type'); processedKeys.add('councilTenant'); processedKeys.add('housingAssociation');
        processedKeys.add('tenancyDuration'); processedKeys.add('living_duration');
        processedKeys.add('hasDampMould');

        const label = (leadFieldLabels[key] || key.replace(/_/g, ' ')).toUpperCase();
        
        // Add Label
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: label, size: 18, color: "94A3B8", bold: true })],
          spacing: { before: 200 }
        }));
        // Add Value
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: String(value), size: 24, color: "1E293B", bold: true })],
          spacing: { after: 100 }
        }));
      }
    });

    // 2. Append any remaining non-system fields
    Object.keys(lead).forEach(key => {
      if (processedKeys.has(key) || systemFields.includes(key)) return;
      
      const value = lead[key];
      if (value !== null && value !== undefined && value !== '') {
        const label = key.replace(/_/g, ' ').toUpperCase();
        
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: label, size: 18, color: "94A3B8", bold: true })],
          spacing: { before: 200 }
        }));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: String(value), size: 24, color: "1E293B", bold: true })],
          spacing: { after: 100 }
        }));
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
