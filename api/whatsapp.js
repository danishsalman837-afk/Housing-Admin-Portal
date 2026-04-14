const { createSupabaseClient, assertEnv } = require("./_supabaseClient");
const axios = require("axios");

module.exports = async function handler(req, res) {
  // 1. Webhook Verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'housing_crm_verify')) {
        console.log("WEBHOOK_VERIFIED");
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send("Verification failed");
      }
    }
  }

  // 2. Incoming Webhook Data (POST)
  if (req.method === 'POST') {
    // Check if it's an outgoing message request from our own dashboard
    // We'll use a special header or a specific body structure to distinguish
    if (req.body.action === 'send_message') {
      return handleOutgoingMessage(req, res);
    }

    // Otherwise, assume it's an incoming webhook from Meta
    return handleIncomingWebhook(req, res);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

async function handleIncomingWebhook(req, res) {
  const body = req.body;

  // Meta sends status updates and messages in the same webhook
  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // Sender's phone number
      const text = message.text ? message.text.body : "";
      const messageId = message.id;

      if (!text) return res.status(200).send("No text content");

      const supabase = createSupabaseClient('service');

      try {
        // 1. Find the lead by phone number
        // We might need to handle different formats (with/out +, etc.)
        const searchPhone = from.startsWith('+') ? from : `+${from}`;
        
        const { data: lead, error: leadError } = await supabase
          .from('submissions')
          .select('id')
          .or(`phone.eq.${searchPhone},mobile_number.eq.${searchPhone},phone.eq.${from},mobile_number.eq.${from}`)
          .maybeSingle();

        if (leadError) throw leadError;

        // 2. Save the message to our whatsapp_messages table
        const { error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert([{
            lead_id: lead ? lead.id : null,
            sender_phone: from,
            receiver_phone: process.env.WHATSAPP_PHONE_NUMBER || 'business',
            message_body: text,
            direction: 'inbound',
            whatsapp_message_id: messageId,
            status: 'received'
          }]);

        if (msgError) console.error("Error saving incoming message:", msgError);

        return res.status(200).send("EVENT_RECEIVED");
      } catch (err) {
        console.error("Webhook processing error:", err);
        return res.status(500).send("Error processing webhook");
      }
    }
    return res.status(200).send("EVENT_RECEIVED");
  } else {
    return res.status(404).send("Not a Meta event");
  }
}

async function handleOutgoingMessage(req, res) {
  const { leadId, phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "Phone and message are required" });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return res.status(500).json({ error: "WhatsApp credentials not configured on server" });
  }

  try {
    // 1. Send via Meta API
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone.replace(/\D/g, ''), // Strip non-digits
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const whatsappId = response.data.messages[0].id;

    // 2. Save to our database
    const supabase = createSupabaseClient('service');
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert([{
        lead_id: leadId,
        sender_phone: 'business',
        receiver_phone: phone,
        message_body: message,
        direction: 'outbound',
        whatsapp_message_id: whatsappId,
        status: 'sent'
      }]);

    if (dbError) throw dbError;

    return res.status(200).json({ success: true, messageId: whatsappId });
  } catch (err) {
    console.error("Error sending WhatsApp message:", err.response ? err.response.data : err.message);
    return res.status(500).json({ 
      error: "Failed to send message", 
      details: err.response ? err.response.data : err.message 
    });
  }
}
