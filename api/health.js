// /api/health.js
const { google } = require('googleapis');

async function checkSheets() {
  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ?.replace(/\\n/g, '\n')
      ?.replace(/^"|"$/g, '')
      ?.trim();
    
    if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
      return { connected: false, error: 'Credenciales faltantes' };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ 
      version: "v4", 
      auth,
      timeout: 5000 
    });
    
    await sheets.spreadsheets.get({ 
      spreadsheetId: process.env.SPREADSHEET_ID 
    });
    
    return { connected: true };
  } catch (err) {
    console.error("❌ Sheets API not available:", err.message);
    return { 
      connected: false, 
      error: err.message 
    };
  }
}

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sheetsCheck = await checkSheets();

    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      sheets: sheetsCheck.connected ? "CONNECTED" : "DISCONNECTED",
      error: sheetsCheck.error || null
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: error.message
    });
  }
};