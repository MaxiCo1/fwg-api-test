// /services/SubmitService.js
const { google } = require('googleapis');
const { authorize } = require('../google-auth/noreply-google-auth');
const { SPREADSHEETS } = require('../constants');
const moment = require('moment');

const SubmitService = {
  pasteSubmitInSpreadsheet
};

async function pasteSubmitInSpreadsheet({ application, metadata }) {
  console.log("🔹 pasteSubmitInSpreadsheet iniciado");

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

  let auth;
  try {
    console.log("🔹 Llamando a authorize()");
    auth = await authorize();
    console.log("🔹 authorize() completado");
  } catch (err) {
    console.error("❌ authorize() falló:", err.message);
    throw new Error("Fallo al autorizar Google API");
  }

  const sheets = google.sheets({ version: 'v4', auth });

  // Promesa con timeout para evitar que Vercel se quede colgado
  const appendPromise = sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEETS.WEBSITE_SETUP_IONOS,
    range: 'Hoja 1!A2',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("⏰ Sheets API timeout")), 8000); // 8 segundos
  });

  try {
    console.log("🔹 Guardando fila en Google Sheets...");
    await Promise.race([appendPromise, timeoutPromise]);
    console.log('✅ Datos pegados en Google Sheets correctamente');
  } catch (err) {
    console.error("❌ Error al pegar en Sheets:", err.message);
    throw err;
  }
}

module.exports = SubmitService;
