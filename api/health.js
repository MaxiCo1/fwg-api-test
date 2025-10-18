// /api/health.js
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

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
    return true;
  } catch (err) {
    console.error("❌ Sheets API not available:", err.message);
    return false;
  }
}

module.exports = async (req, res) => {
  const sheetsEnabled = await checkSheets();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.status(200).json({
    status: "OK",
    sheets: sheetsEnabled ? "CONNECTED" : "DISCONNECTED"
  });
};
