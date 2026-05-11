const env = require('../config/env');

async function send({ to, subject, body }) {
  if (env.NOTIFICATIONS_MOCK) {
    return {
      ok: true,
      mock: true,
      message_id: `mock-gmail-${Date.now()}`,
    };
  }

  const { google } = require('googleapis');
  const oAuth2Client = new google.auth.OAuth2(
    env.gmail.clientId,
    env.gmail.clientSecret
  );
  oAuth2Client.setCredentials({ refresh_token: env.gmail.refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  const raw = Buffer.from(
    `From: ${env.gmail.sender}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
    body
  )
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { ok: true, mock: false, message_id: res.data.id };
}

module.exports = { send };
