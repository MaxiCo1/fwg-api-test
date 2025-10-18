// /services/SubmitService.js
const { google } = require('googleapis');
const { authorize } = require('../google-auth/noreply-google-auth');
const { SPREADSHEETS } = require('../constants');
const moment = require('moment');

async function pasteSubmitInSpreadsheet({ application, metadata }) {
  console.log('📝 Iniciando pasteSubmitInSpreadsheet...');
  
  let auth;
  try {
    const timestamp = moment().format('DD/MM/YYYY HH:mm:ss');
    console.log('🕐 Timestamp:', timestamp);

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

    console.log('📊 Row data preparada:', row.slice(0, 3)); // Log primeros 3 elementos

    console.log('🔑 Obteniendo auth...');
    auth = await authorize();
    
    console.log('📋 Creando cliente de Sheets...');
    const sheets = google.sheets({ 
      version: 'v4', 
      auth,
      timeout: 15000 // 15 segundos timeout
    });

    console.log('📤 Enviando datos a Google Sheets...');
    console.log('📋 Spreadsheet ID:', SPREADSHEETS.WEBSITE_SETUP_IONOS);
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEETS.WEBSITE_SETUP_IONOS,
      range: 'Hoja 1!A:Q',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { 
        values: [row] 
      }
    });

    console.log('✅ Datos escritos exitosamente en Sheets');
    console.log('📈 Celdas actualizadas:', response.data.updates?.updatedCells);
    
    return response;
    
  } catch (error) {
    console.error('❌ Error en pasteSubmitInSpreadsheet:');
    console.error('📌 Mensaje:', error.message);
    console.error('📌 Código:', error.code);
    
    if (error.response) {
      console.error('📌 Respuesta de error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    if (error.errors) {
      console.error('📌 Errores detallados:', error.errors);
    }
    
    throw error;
  }
}

module.exports = { pasteSubmitInSpreadsheet };