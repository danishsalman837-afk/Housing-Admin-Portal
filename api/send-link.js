const { createSupabaseClient, assertEnv } = require("./supabaseClient");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

/**
 * POST /api/send-link
 * Body: { activity_id }
 *
 * 1. Fetches the solicitor_activity record
 * 2. Fetches the lead details (generates a token for it if missing)
 * 3. Fetches the solicitor (member) email
 * 4. Sends the email via SMTP
 * 5. Updates solicitor_activity status to 'Sent'
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!assertEnv('service', res)) return;

  const supabase = createSupabaseClient('service');
  const { activity_id } = req.body;

  if (!activity_id) return res.status(400).json({ error: "activity_id is required" });

  try {
    // 1. Fetch the activity record
    const { data: activity, error: actErr } = await supabase
      .from('solicitor_activity')
      .select('*')
      .eq('id', activity_id)
      .single();

    if (actErr || !activity) return res.status(404).json({ error: "Activity record not found." });

    // 2. Fetch the lead
    const { data: lead, error: leadErr } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', activity.lead_id)
      .single();

    if (leadErr || !lead) return res.status(404).json({ error: "Lead not found." });

    // 3. Generate unique_token if missing
    let token = lead.unique_token;
    if (!token) {
      token = crypto.randomUUID();
      const { error: tokenErr } = await supabase
        .from('submissions')
        .update({ unique_token: token })
        .eq('id', lead.id);
      if (tokenErr) return res.status(500).json({ error: "Failed to generate token: " + tokenErr.message });
    }

    // 4. Fetch the solicitor member
    const { data: member, error: memErr } = await supabase
      .from('company_members')
      .select('*')
      .eq('id', activity.solicitor_id)
      .single();

    if (memErr || !member) return res.status(404).json({ error: "Solicitor member not found." });
    if (!member.email) return res.status(400).json({ error: "Solicitor has no email address on file." });

    // 5. Construct the unique URL
    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
    const solicitUrl = `${baseUrl}/solicitor.html?token=${token}`;

    // 6. Build the HTML email
    const leadName = lead.name || lead.first_name || 'a client';
    const emailHtml = buildEmailTemplate(leadName, solicitUrl, member);

    // 7. Send email via SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: member.email,
      subject: `New Housing Disrepair Lead — Action Required`,
      html: emailHtml,
    });

    // 8. Update activity status to 'Sent'
    const { data: updated, error: updErr } = await supabase
      .from('solicitor_activity')
      .update({ status: 'Sent', sent_at: new Date().toISOString() })
      .eq('id', activity_id)
      .select();

    if (updErr) return res.status(500).json({ error: "Email sent, but failed to update status: " + updErr.message });

    return res.status(200).json({ success: true, activity: updated[0] });
  } catch (err) {
    console.error("Send Link Error:", err);
    return res.status(500).json({ error: "Failed to send email: " + err.message });
  }
};

/**
 * Build professional HTML email template
 */
function buildEmailTemplate(leadName, url, member) {
  const solicitorName = ((member.first_name || '') + ' ' + (member.last_name || '')).trim() || 'Solicitor';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#F2F2F7; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:32px;">
      <div style="display:inline-block; width:48px; height:48px; background:linear-gradient(145deg, #0A84FF 0%, #0050D0 100%); border-radius:14px; margin-bottom:16px; line-height:48px;">
        <span style="color:white; font-size:20px; font-weight:800;">H</span>
      </div>
      <h1 style="margin:0; font-size:22px; font-weight:700; color:#1C1C1E; letter-spacing:-0.5px;">Housing Disrepair Lead</h1>
      <p style="margin:6px 0 0; font-size:13px; color:#636366;">A new lead has been allocated to you for review</p>
    </div>

    <!-- Main Card -->
    <div style="background:white; border-radius:16px; padding:32px 28px; box-shadow:0 2px 12px rgba(0,0,0,0.06); border:1px solid rgba(60,60,67,0.08);">
      
      <p style="margin:0 0 20px; font-size:15px; color:#1C1C1E; line-height:1.6;">
        Dear <strong>${solicitorName}</strong>,
      </p>

      <p style="margin:0 0 20px; font-size:14px; color:#3C3C43; line-height:1.7;">
        A new housing disrepair lead for <strong>${leadName}</strong> has been allocated to your firm. 
        Please review the lead details using the secure link below and indicate whether you wish to 
        <strong>accept</strong> or <strong>reject</strong> this case.
      </p>

      <!-- Key Info Box -->
      <div style="background:#F2F2F7; border-radius:12px; padding:16px 20px; margin-bottom:24px; border:1px solid rgba(60,60,67,0.06);">
        <div style="font-size:11px; font-weight:700; color:#636366; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">Lead Summary</div>
        <div style="font-size:14px; color:#1C1C1E; font-weight:600;">Client: ${leadName}</div>
        <div style="font-size:12px; color:#636366; margin-top:4px;">Category: Housing Disrepair</div>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center; margin:28px 0;">
        <a href="${url}" 
           style="display:inline-block; padding:14px 40px; background:linear-gradient(145deg, #0A84FF 0%, #0566CC 100%); color:white; text-decoration:none; border-radius:12px; font-size:15px; font-weight:700; letter-spacing:-0.2px; box-shadow:0 4px 14px rgba(10,132,255,0.35);">
          Review Lead Details
        </a>
      </div>

      <p style="margin:20px 0 0; font-size:12px; color:#AEAEB2; line-height:1.6; text-align:center;">
        If the button above doesn't work, copy and paste this link into your browser:<br>
        <a href="${url}" style="color:#0A84FF; word-break:break-all;">${url}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center; margin-top:28px; padding:0 20px;">
      <p style="font-size:11px; color:#AEAEB2; line-height:1.5; margin:0;">
        This is a secure, single-use link generated by the HDR CRM system.<br>
        Do not forward this email. Contact details will be revealed upon acceptance.
      </p>
      <p style="font-size:10px; color:#C7C7CC; margin-top:16px;">
        &copy; ${new Date().getFullYear()} HDR CRM — Housing Disrepair Admin Portal
      </p>
    </div>

  </div>
</body>
</html>`;
}
