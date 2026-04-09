const { createSupabaseClient, assertEnv, normalizeLead } = require("./_supabaseClient");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

/**
 * Combined Solicitor endpoint
 * Routes handled:
 * ?route=activity (GET list, POST create/update/delete)
 * ?route=send-link (POST only)
 * ?route=view (GET view lead, POST accept/reject)
 */
module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const route = req.query.route;

  // ═════════════════════════════════════════════════
  // ROUTE: ACTIVITY
  // ═════════════════════════════════════════════════
  if (route === 'activity') {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase.from('solicitor_activity').select('*').order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data || []);
      } catch (err) {
        return res.status(500).json({ error: "Server Error: " + err.message });
      }
    }
    
    if (req.method === 'POST') {
      try {
        const { id, action, ...fields } = req.body;
        if (id && action === 'delete') {
          const { error } = await supabase.from('solicitor_activity').delete().eq('id', id);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        if (id) {
          const { data, error } = await supabase.from('solicitor_activity').update(fields).eq('id', id).select();
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json(data[0]);
        }
        if (!fields.lead_id) return res.status(400).json({ error: "lead_id is required" });
        if (!fields.solicitor_id) return res.status(400).json({ error: "solicitor_id is required" });
        fields.status = fields.status || 'Allocated';
        fields.created_at = new Date().toISOString();
        const { data, error } = await supabase.from('solicitor_activity').insert([fields]).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
      } catch (err) {
        return res.status(500).json({ error: "Server Error: " + err.message });
      }
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ═════════════════════════════════════════════════
  // ROUTE: SEND-LINK
  // ═════════════════════════════════════════════════
  if (route === 'send-link') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { activity_id } = req.body;
    if (!activity_id) return res.status(400).json({ error: "activity_id is required" });

    try {
      const { data: activity, error: actErr } = await supabase.from('solicitor_activity').select('*').eq('id', activity_id).single();
      if (actErr || !activity) return res.status(404).json({ error: "Activity record not found." });

      const { data: lead, error: leadErr } = await supabase.from('submissions').select('*').eq('id', activity.lead_id).single();
      if (leadErr || !lead) return res.status(404).json({ error: "Lead not found." });

      let token = lead.unique_token;
      if (!token) {
        token = crypto.randomUUID();
        const { error: tokenErr } = await supabase.from('submissions').update({ unique_token: token }).eq('id', lead.id);
        if (tokenErr) return res.status(500).json({ error: "Failed to generate token: " + tokenErr.message });
      }

      const { data: member, error: memErr } = await supabase.from('company_members').select('*').eq('id', activity.solicitor_id).single();
      if (memErr || !member) return res.status(404).json({ error: "Solicitor member not found." });
      if (!member.email) return res.status(400).json({ error: "Solicitor has no email address on file." });
      if (member.can_receive_emails === false) return res.status(403).json({ error: "This solicitor member is not authorized to receive emails." });

      const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
      const solicitUrl = `${baseUrl}/solicitor.html?token=${token}`;
      const leadName = lead.name || lead.first_name || 'a client';
      const emailHtml = buildEmailTemplate(leadName, solicitUrl, member, lead);

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: member.email,
        subject: `New Housing Disrepair Lead — Action Required`,
        html: emailHtml,
      });

      const { data: updated, error: updErr } = await supabase.from('solicitor_activity').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', activity_id).select();
      if (updErr) return res.status(500).json({ error: "Email sent, but failed to update status: " + updErr.message });
      
      // SYNC: Update the main lead status to 'Sent'
      await supabase.from('submissions').update({ leadStatus: 'Sent' }).eq('id', activity.lead_id);
      
      return res.status(200).json({ success: true, activity: updated[0] });
    } catch (err) {
      return res.status(500).json({ error: "Failed to send email: " + err.message });
    }
  }

  // ═════════════════════════════════════════════════
  // ROUTE: VIEW (Accept/Reject Public Page)
  // ═════════════════════════════════════════════════
  if (route === 'view') {
    if (req.method === 'GET') {
      const { token } = req.query;
      if (!token) return res.status(400).json({ error: "Token is required." });

      try {
        const { data: lead, error: leadErr } = await supabase.from('submissions').select('*').eq('unique_token', token).single();
        if (leadErr || !lead) return res.status(404).json({ error: "Lead not found or link is invalid." });

        const { data: activities, error: actErr } = await supabase.from('solicitor_activity').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1);
        const activity = (activities && activities.length > 0) ? activities[0] : null;
        const activityStatus = activity ? activity.status : 'Unknown';

        const normalized = normalizeLead({ ...lead });
        const isAccepted = activityStatus === 'Accepted';

        return res.status(200).json({
          id: lead.id,
          activity_id: activity ? activity.id : null,
          status: activityStatus,
          name: normalized.name || normalized.first_name || '---',
          tenantType: normalized.tenantType || '---',
          landlordName: isAccepted ? (normalized.landlordName || '---') : '••••••••',
          address: isAccepted ? (normalized.address || '---') : '••••••••••••••••••••',
          postcode: isAccepted ? (normalized.postcode || '---') : '••••••••',
          damp: normalized.damp || '---', dampLocation: normalized.dampLocation || '---', dampRooms: normalized.dampRooms || '---',
          dampSurface: normalized.dampSurface || '---', dampDuration: normalized.dampDuration || '---', dampCause: normalized.dampCause || '---',
          dampDamage: normalized.dampDamage || '---', dampHealth: normalized.dampHealth || '---',
          leak: normalized.leak || '---', leakLocation: normalized.leakLocation || '---', leakSource: normalized.leakSource || '---',
          leakStart: normalized.leakStart || '---', leakDamage: normalized.leakDamage || '---', leakCracks: normalized.leakCracks || '---',
          leakBelongings: normalized.leakBelongings || '---',
          issues_electrics: normalized.issues_electrics || '---', issues_heating: normalized.issues_heating || '---', issues_structural: normalized.issues_structural || '---',
          reported: normalized.reported || '---', reportCount: normalized.reportCount || '---', reportFirst: normalized.reportFirst || '---',
          reportLast: normalized.reportLast || '---', reportResponse: normalized.reportResponse || '---', reportAttempt: normalized.reportAttempt || '---',
          reportStatus: normalized.reportStatus || '---',
          email: isAccepted ? (normalized.email || '---') : '••••••••@••••.com',
          phone: isAccepted ? (normalized.phone || normalized.mobile_number || '---') : '•••• ••• ••••',
          dob: isAccepted ? (normalized.dob || '---') : '••/••/••••',
          attachments: normalized.attachments || [],
          contactRevealed: isAccepted,
        });
      } catch (err) { return res.status(500).json({ error: "Server Error: " + err.message }); }
    }

    if (req.method === 'POST') {
      const { token, action, rejection_reason } = req.body;
      if (!token) return res.status(400).json({ error: "Token is required." });
      if (!action || !['accept', 'reject'].includes(action)) return res.status(400).json({ error: "Action must be 'accept' or 'reject'." });

      try {
        const { data: lead, error: leadErr } = await supabase.from('submissions').select('*').eq('unique_token', token).single();
        if (leadErr || !lead) {
          console.error("Lead Error:", leadErr);
          return res.status(404).json({ error: "Lead not found or link is invalid." });
        }

        const { data: activities, error: actErr } = await supabase.from('solicitor_activity').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1);
        if (actErr || !activities || activities.length === 0) return res.status(404).json({ error: "No solicitor activity found for this lead." });
        const activity = activities[0];

        if (activity.status === 'Accepted' || activity.status === 'Rejected') return res.status(400).json({ error: `This lead has already been ${activity.status.toLowerCase()}.` });

        if (action === 'accept') {
          const { error: updErr } = await supabase.from('solicitor_activity').update({ status: 'Accepted' }).eq('id', activity.id);
          if (updErr) return res.status(500).json({ error: updErr.message });
          await supabase.from('submissions').update({ 
              actual_status: 'Assigned',
              leadStatus: 'Accepted' 
          }).eq('id', lead.id);
          
          const { data: fullLead } = await supabase.from('submissions').select('*').eq('id', lead.id).single();
          const normalized = normalizeLead({ ...(fullLead || {}) });
          return res.status(200).json({ 
            success: true, 
            status: 'Accepted', 
            contactDetails: { 
              email: normalized.email || '---', 
              phone: normalized.phone || normalized.mobile_number || '---', 
              dob: normalized.dob || '---',
              address: normalized.address || '---',
              postcode: normalized.postcode || '---',
              landlordName: normalized.landlordName || '---'
            } 
          });
        } else if (action === 'reject') {
          if (!rejection_reason || !rejection_reason.trim()) return res.status(400).json({ error: "A rejection reason is required." });
          const { error: updErr } = await supabase.from('solicitor_activity').update({ status: 'Rejected', rejection_reason: rejection_reason.trim() }).eq('id', activity.id);
          if (updErr) return res.status(500).json({ error: updErr.message });
          await supabase.from('submissions').update({ 
              actual_status: 'Re-assign',
              leadStatus: 'Rejected'
          }).eq('id', lead.id);
          return res.status(200).json({ success: true, status: 'Rejected' });
        }
      } catch (err) { return res.status(500).json({ error: "Server Error: " + err.message }); }
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return res.status(404).json({ error: 'Route not found' });
};

function buildEmailTemplate(leadName, url, member, lead = {}) {
  const solicitorName = ((member.first_name || '') + ' ' + (member.last_name || '')).trim() || 'Solicitor';
  const attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
  
  let attachmentSection = '';
  if (attachments.length > 0) {
    attachmentSection = `
      <div style="margin-top:20px; padding:16px; background:#FFF9F0; border:1px solid #FFE6C7; border-radius:12px;">
        <div style="font-size:11px; font-weight:700; color:#B06600; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">Supporting Evidence / Pictures</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${attachments.map(a => `<a href="${a.url}" style="font-size:13px; color:#0A84FF; text-decoration:none; display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:6px; height:6px; background:#0A84FF; border-radius:50%;"></span>
            ${a.name}
          </a>`).join('')}
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0; padding:0; background:#F2F2F7; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><div style="max-width:600px; margin:0 auto; padding:40px 20px;"><div style="text-align:center; margin-bottom:32px;"><div style="display:inline-block; width:48px; height:48px; background:linear-gradient(145deg, #0A84FF 0%, #0050D0 100%); border-radius:14px; margin-bottom:16px; line-height:48px;"><span style="color:white; font-size:20px; font-weight:800;">H</span></div><h1 style="margin:0; font-size:22px; font-weight:700; color:#1C1C1E; letter-spacing:-0.5px;">Housing Disrepair Lead</h1><p style="margin:6px 0 0; font-size:13px; color:#636366;">A new lead has been allocated to you for review</p></div><div style="background:white; border-radius:16px; padding:32px 28px; box-shadow:0 2px 12px rgba(0,0,0,0.06); border:1px solid rgba(60,60,67,0.08);"><p style="margin:0 0 20px; font-size:15px; color:#1C1C1E; line-height:1.6;">Dear <strong>${solicitorName}</strong>,</p><p style="margin:0 0 20px; font-size:14px; color:#3C3C43; line-height:1.7;">A new housing disrepair lead for <strong>${leadName}</strong> has been allocated to your firm. Please review the lead details using the secure link below and indicate whether you wish to <strong>accept</strong> or <strong>reject</strong> this case.</p><div style="background:#F2F2F7; border-radius:12px; padding:16px 20px; margin-bottom:24px; border:1px solid rgba(60,60,67,0.06);"><div style="font-size:11px; font-weight:700; color:#636366; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">Lead Summary</div><div style="font-size:14px; color:#1C1C1E; font-weight:600;">Client: ${leadName}</div><div style="font-size:12px; color:#636366; margin-top:4px;">Category: Housing Disrepair</div> ${attachmentSection} </div><div style="text-align:center; margin:28px 0;"><a href="${url}" style="display:inline-block; padding:14px 40px; background:linear-gradient(145deg, #0A84FF 0%, #0566CC 100%); color:white; text-decoration:none; border-radius:12px; font-size:15px; font-weight:700; letter-spacing:-0.2px; box-shadow:0 4px 14px rgba(10,132,255,0.35);">Review Lead Details</a></div><p style="margin:20px 0 0; font-size:12px; color:#AEAEB2; line-height:1.6; text-align:center;">If the button above doesn't work, copy and paste this link into your browser:<br><a href="${url}" style="color:#0A84FF; word-break:break-all;">${url}</a></p></div><div style="text-align:center; margin-top:28px; padding:0 20px;"><p style="font-size:11px; color:#AEAEB2; line-height:1.5; margin:0;">This is a secure, single-use link generated by the HDR CRM system.<br>Do not forward this email. Contact details will be revealed upon acceptance.</p><p style="font-size:10px; color:#C7C7CC; margin-top:16px;">&copy; ${new Date().getFullYear()} HDR CRM — Housing Disrepair Admin Portal</p></div></div></body></html>`;
}
