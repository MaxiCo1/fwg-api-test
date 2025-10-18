const { google } = require("googleapis");

function authorize() {
  try {
    console.log('🔧 Iniciando autenticación Google...');
    
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!privateKey) {
      throw new Error('GOOGLE_PRIVATE_KEY no está definida');
    }

    if (!clientEmail) {
      throw new Error('GOOGLE_CLIENT_EMAIL no está definida');
    }

    console.log('📧 Client Email:', clientEmail);
    console.log('🔑 Private Key raw length:', privateKey.length);
    console.log('🔑 Private Key starts with:', privateKey.substring(0, 50));
    
    // DETECTAR si la clave ya tiene saltos de línea reales
    const hasActualNewlines = privateKey.includes('\n') && !privateKey.includes('\\n');
    const hasEscapedNewlines = privateKey.includes('\\n');
    
    console.log('🔍 Detected - Actual newlines:', hasActualNewlines);
    console.log('🔍 Detected - Escaped newlines:', hasEscapedNewlines);

    let cleanedPrivateKey = privateKey;
    
    // Si tiene saltos de línea reales (sin \\n), ya está en formato correcto
    if (hasActualNewlines) {
      console.log('✅ Private Key ya tiene saltos de línea reales');
      cleanedPrivateKey = privateKey;
    } 
    // Si tiene \\n, convertirlos a saltos reales
    else if (hasEscapedNewlines) {
      console.log('🔄 Convirtiendo \\n a saltos de línea reales');
      cleanedPrivateKey = privateKey.replace(/\\n/g, '\n');
    }
    // Si no tiene ninguno, asumir que es una sola línea y formatear
    else {
      console.log('⚠️  Private Key sin formato claro, intentando formatear...');
      // Buscar patrones comunes de private keys
      if (privateKey.includes('BEGIN PRIVATE KEY') && privateKey.includes('END PRIVATE KEY')) {
        // Intentar dividir en líneas lógicas (cada 64 chars es común en base64)
        const lines = [];
        let current = privateKey;
        
        // Extraer el contenido entre BEGIN y END
        const beginIndex = privateKey.indexOf('BEGIN PRIVATE KEY-----');
        const endIndex = privateKey.indexOf('-----END PRIVATE KEY');
        
        if (beginIndex !== -1 && endIndex !== -1) {
          const header = privateKey.substring(0, beginIndex + 22);
          const footer = privateKey.substring(endIndex);
          const content = privateKey.substring(beginIndex + 22, endIndex);
          
          // Dividir el contenido en líneas de ~64 caracteres
          lines.push(header);
          for (let i = 0; i < content.length; i += 64) {
            lines.push(content.substring(i, i + 64));
          }
          lines.push(footer);
          
          cleanedPrivateKey = lines.join('\n') + '\n';
        }
      }
    }

    // Asegurar formato final
    if (!cleanedPrivateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      cleanedPrivateKey = '-----BEGIN PRIVATE KEY-----\n' + cleanedPrivateKey;
    }
    
    if (!cleanedPrivateKey.endsWith('-----END PRIVATE KEY-----\n')) {
      if (!cleanedPrivateKey.endsWith('\n')) {
        cleanedPrivateKey += '\n';
      }
      cleanedPrivateKey += '-----END PRIVATE KEY-----\n';
    }

    console.log('🔑 Private Key final length:', cleanedPrivateKey.length);
    console.log('🔑 First line:', cleanedPrivateKey.split('\n')[0]);
    console.log('🔑 Sample middle:', cleanedPrivateKey.split('\n')[2]?.substring(0, 20) + '...');

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
    console.error('📌 Stack:', error.stack);
    throw error;
  }
}

module.exports = { authorize };