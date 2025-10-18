// /services/SubmitService.js
const { google } = require('googleapis');
const { authorize } = require('../google-auth/noreply-google-auth');
const { SPREADSHEETS } = require('../constants');
const moment = require('moment');

const SubmitService = {
  pasteSubmitInSpreadsheet
};

async function pasteSubmitInSpreadsheet({ application, metadata }) {
  const timestamp = moment().format('DD/MM/YYYY HH:mm:ss');

  const row = [
    timestamp,
    application.project_description || "",
    application.first_name || "",
    application.email_address || "",
    application.phone_number || "",
    application.web_hosting || "",
    application.utm_source || "",
    application.utm_medium || "",
    application.utm_campaign || "",
    application.utm_term || "",
    application.utm_content || "",
    application.affiliate_id || "",
    metadata?.mobile ? "Mobile" : "Desktop",
    metadata?.userAgent || "",
    application.fbclid || "",
    application.gclid || "",
    application.language || "en"
  ];

  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEETS.WEBSITE_SETUP_IONOS,
    range: 'Hoja 1!A2',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });

  console.log('✅ Datos pegados en Google Sheets correctamente');
}

module.exports = SubmitService;
