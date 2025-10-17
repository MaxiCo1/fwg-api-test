// /api/health.js
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

let sheetsEnabled = false;

async function checkSheets() {
  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ?.replace(/\\n/g, '\n')
      ?.replace(/\\\\n/g, '\n')
      ?.replace(/"/g, '');
    
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    sheetsEnabled = true;
  } catch (error) {
    console.error("❌ Sheets API not available:", error.message);
    sheetsEnabled = false;
  }
}

// Endpoint Vercel
module.exports = async (req, res) => {
  await checkSheets();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.status(200).json({
    status: "OK",
    sheets: sheetsEnabled ? "CONNECTED" : "DISCONNECTED"
  });
};
