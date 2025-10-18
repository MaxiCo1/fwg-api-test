const { google } = require("googleapis");

function authorize() {
  try {
    console.log('🔧 Iniciando autenticación Google...');
    
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!privateKey) {
      throw new Error('GOOGLE_PRIVATE_KEY no está definida');
    }

    if (!clientEmail) {
      throw new Error('GOOGLE_CLIENT_EMAIL no está definida');
    }

    // Limpiar la private key para Node 20
    const cleanedPrivateKey = privateKey.replace(/\\n/g, '\n');

    console.log('📧 Client Email:', clientEmail);
    console.log('🔑 Private Key length:', cleanedPrivateKey.length);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: cleanedPrivateKey
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    console.log('✅ Autenticación configurada correctamente');
    return auth;

  } catch (error) {
    console.error('❌ Error en authorize:', error.message);
    throw error;
  }
}

module.exports = { authorize };