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

/**
 * Envia un mensaje usando un template aprobado en Meta.
 *
 * @param {object} args
 * @param {string} args.to        Numero destino en E.164 (con o sin '+').
 * @param {object} args.template  Payload del template tal cual lo arma el
 *                                dispatcher: { name, language: { code }, components? }.
 *
 * Respeta NOTIFICATIONS_MOCK igual que `send`: en modo mock no llama a Meta,
 * loguea el payload y devuelve un id sintetico.
 *
 * En modo real propaga los errores de la Graph API. El llamador puede leer
 * `err.response.data.error` (con `code` y `message` de Meta) para mapear
 * 131030 / 190 / 132001 a mensajes amigables.
 */
async function sendTemplate({ to, template }) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template,
  };

  if (env.NOTIFICATIONS_MOCK) {
    console.log('[whatsapp:mock] sendTemplate ->', JSON.stringify(payload));
    return {
      ok: true,
      mock: true,
      message_id: `mock-wa-tpl-${Date.now()}`,
      payload,
    };
  }

  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;

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

module.exports = { send, sendTemplate };
