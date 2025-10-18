const { google } = require("googleapis");

function authorize() {
  try {
    // Manejo más robusto de la private key
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('GOOGLE_PRIVATE_KEY no está definida');
    }

    // Limpiar la private key
    privateKey = privateKey
      .replace(/\\n/g, "\n")
      .replace(/\\\\n/g, "\n")
      .replace(/^"|"$/g, '')
      .trim();

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    return auth;
  } catch (error) {
    console.error('Error en authorize:', error);
    throw error;
  }
}

module.exports = { authorize };