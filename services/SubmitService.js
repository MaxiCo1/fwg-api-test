// /services/SubmitService.js
const { google } = require('googleapis');
const { authorize } = require('../google-auth/noreply-google-auth');
const { SPREADSHEETS } = require('../constants');
const moment = require('moment');

async function pasteSubmitInSpreadsheet({ application, metadata }) {
  let auth;
  
  try {
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

    console.log('🔧 Autenticando con Google Sheets...');
    auth = await authorize();
    
    const sheets = google.sheets({ 
      version: 'v4', 
      auth,
      timeout: 10000 // 10 segundos timeout
    });

    console.log('📝 Escribiendo en Google Sheets...');
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEETS.WEBSITE_SETUP_IONOS,
      range: 'Hoja 1!A:Q', // Rango más específico
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { 
        values: [row] 
      }
    });

    console.log('✅ Datos pegados en Google Sheets correctamente');
    return response;
    
  } catch (error) {
    console.error('❌ Error en pasteSubmitInSpreadsheet:', error);
    
    // Log más detallado del error
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    if (error.response) {
      console.error('Respuesta de error:', error.response.data);
    }
    
    throw error;
  }
}

module.exports = { pasteSubmitInSpreadsheet };