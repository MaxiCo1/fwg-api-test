const { google } = require("googleapis");

function authorize() {
  try {
    console.log('🔧 Iniciando autenticación...');
    
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!privateKey) {
      throw new Error('GOOGLE_PRIVATE_KEY no está definida');
    }

    if (!clientEmail) {
      throw new Error('GOOGLE_CLIENT_EMAIL no está definida');
    }

    console.log('📧 Client Email:', clientEmail);
    console.log('🔑 Private Key length:', privateKey.length);

    // IMPORTANTE: Verificar y limpiar la private key
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      console.log('⚠️  Private Key parece estar en formato incorrecto');
    }

    // Asegurar que los \n sean interpretados correctamente
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Verificar que termine con newline
    if (!privateKey.endsWith('\n')) {
      privateKey += '\n';
    }

    console.log('🔑 Private Key cleaned length:', privateKey.length);
    console.log('🔑 First line:', privateKey.split('\n')[0]);
    console.log('🔑 Last line:', privateKey.split('\n').filter(Boolean).pop());

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    console.log('✅ Autenticación configurada correctamente');
    return auth;

  } catch (error) {
    console.error('❌ Error crítico en authorize:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

module.exports = { authorize };