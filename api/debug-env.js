// api/debug-env.js
module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const envInfo = {
    GOOGLE_CLIENT_EMAIL: clientEmail ? `✅ ${clientEmail}` : '❌ MISSING',
    GOOGLE_PRIVATE_KEY: privateKey ? `✅ Length: ${privateKey.length} chars` : '❌ MISSING',
    SPREADSHEET_ID: spreadsheetId ? `✅ ${spreadsheetId}` : '❌ MISSING',
    NODE_VERSION: process.version,
    NODE_ENV: process.env.NODE_ENV || 'not set',
    TIMESTAMP: new Date().toISOString()
  };

  console.log('🔍 Environment Debug Info:', envInfo);
  
  res.status(200).json(envInfo);
};