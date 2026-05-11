const axios = require('axios');
const env = require('../config/env');

async function send({ to, body }) {
  if (env.NOTIFICATIONS_MOCK) {
    return {
      ok: true,
      mock: true,
      message_id: `mock-wa-${Date.now()}`,
    };
  }

  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    ok: true,
    mock: false,
    message_id: res.data?.messages?.[0]?.id || null,
  };
}

module.exports = { send };
