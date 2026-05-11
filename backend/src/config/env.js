require('dotenv').config();

module.exports = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NOTIFICATIONS_MOCK: (process.env.NOTIFICATIONS_MOCK || 'true').toLowerCase() === 'true',
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    sender: process.env.GMAIL_SENDER || 'no-reply@local',
  },
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  },
};
