const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleAuth } = require('google-auth-library');

require('dotenv').config();

const app = express();

// ✅ Configuración CORS simplificada y única
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://fwg-apply-form.vercel.app",
      "https://fwg-form-test.vercel.app",
      "https://thefreewebsiteguys.com",
      "http://localhost:3000", 
      "http://localhost:5173",
      "http://127.0.0.1:5500"
    ];
    
    // Permitir requests sin origin (como mobile apps o postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`❌ CORS bloqueado para origen: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Aplicar CORS una sola vez
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de Google Sheets
let sheets;
let sheetsEnabled = false;

async function initializeSheets() {
  try {
    console.log("🔄 Initializing Google Sheets API...");
    
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error("GOOGLE_PRIVATE_KEY no está definido");
    }
    if (!process.env.SPREADSHEET_ID) {
      throw new Error("SPREADSHEET_ID no está definido");
    }

    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ?.replace(/\\n/g, '\n')
      ?.replace(/\\\\n/g, '\n')
      ?.replace(/"/g, '');

    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheets = google.sheets({ version: "v4", auth });
    
    // Test de conexión real
    const testResponse = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID
    });
    
    console.log(`✅ Conectado a Google Sheets: ${testResponse.data.properties.title}`);
    sheetsEnabled = true;
    
  } catch (error) {
    console.error("❌ Error inicializando Google Sheets:", error.message);
    sheetsEnabled = false;
  }
}

initializeSheets();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "Hoja 1";

function validateApplicationData(application) {
  const errors = [];
  
  if (!application?.first_name?.trim()) {
    errors.push("El nombre es requerido");
  }
  
  if (!application?.email_address?.trim()) {
    errors.push("El email es requerido");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email_address)) {
    errors.push("El formato del email es inválido");
  }
  
  if (!application?.project_description?.trim()) {
    errors.push("La descripción del proyecto es requerida");
  }
  
  return errors;
}

function prepareRow(application, metadata) {
  const timestamp = new Date().toISOString();
  
  return [
    application.project_description || "",
    application.first_name || "",
    application.email_address || "",
    application.phone_number || "",
    application.web_hosting || "",
    application.utm_source || "",
    application.utm_medium || "",
    application.utm_campaign || "",
    application.utm_source || "",
    timestamp,
    application.sessionInstanceUUID || "",
    application.affiliate_id || "",
    application.completed ? "1" : "0",
    application.utm_source || "",
    "", "", "", "", "",
    metadata?.mobile ? "Mobile" : "Desktop",
    "", "", "",
    application.completed ? "Completed" : "Incomplete",
    metadata?.userAgent || "",
    "",
    application.fbclid || "",
    application.gclid || "",
    application.language || "en",
    application.country_code ? `+${application.country_code.phoneCode}` : "",
    application.country_code ? application.country_code.name : "",
    application.utm_term || "",
    application.utm_content || "",
    metadata?.browser || "",
    metadata?.browserVersion || "",
    metadata?.os || "",
    metadata?.referrer || "",
    metadata?.screenWidth || "",
    metadata?.screenHeight || "",
    metadata?.language || "",
    metadata?.online ? "Yes" : "No"
  ];
}

async function saveToSheets(row) {
  if (!sheetsEnabled) {
    throw new Error("Google Sheets API no está habilitada");
  }

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:AZ`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { 
        values: [row] 
      },
    });

    console.log(`✅ Datos guardados en fila: ${response.data.updates?.updatedRange}`);
    return response;
    
  } catch (error) {
    console.error("❌ Error guardando en Sheets:", error.message);
    if (error.response) {
      console.error("Detalles del error:", error.response.data);
    }
    throw error;
  }
}

// ✅ Middleware mejorado para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// ✅ Ruta OPTIONS específica para /submit
app.options("/submit", (req, res) => {
  console.log("🛫 Preflight OPTIONS para /submit");
  res.status(200).end();
});

app.post("/submit", async (req, res) => {
  // ✅ HEADERS CORS explícitos para la respuesta
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://fwg-apply-form.vercel.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    console.log("📨 Recibiendo solicitud de envío");
    console.log("📝 Body recibido:", JSON.stringify(req.body, null, 2));

    const { application, metadata } = req.body;

    if (!application) {
      console.log("❌ Datos de aplicación no recibidos");
      return res.status(400).json({ 
        success: false, 
        error: "Datos de aplicación requeridos" 
      });
    }

    // ✅ Validación completa de datos
    const validationErrors = validateApplicationData(application);
    if (validationErrors.length > 0) {
      console.log("❌ Errores de validación:", validationErrors);
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationErrors
      });
    }

    console.log("✅ Datos validados:", {
      nombre: application.first_name,
      email: application.email_address,
      proyecto: application.project_description?.substring(0, 50) + '...'
    });

    // ✅ Verificar que Sheets esté habilitado
    if (!sheetsEnabled) {
      console.log("❌ Sheets API no disponible");
      await initializeSheets(); // Intentar reconectar
      
      if (!sheetsEnabled) {
        return res.status(503).json({ 
          success: false, 
          error: "Servicio de almacenamiento no disponible temporalmente" 
        });
      }
    }

    // ✅ Preparar y guardar datos
    const row = prepareRow(application, metadata);
    console.log("💾 Guardando en Google Sheets...");
    
    const sheetsResponse = await saveToSheets(row);
    
    console.log("✅ Datos guardados exitosamente en Google Sheets");
    
    // ✅ Respuesta de éxito
    return res.status(200).json({ 
      success: true, 
      message: "Datos guardados exitosamente",
      sheetsUpdated: true,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Error en /submit:", err.message);
    console.error("Stack trace:", err.stack);
    
    return res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor al guardar datos",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      sheetsEnabled: sheetsEnabled
    });
  }
});

// Rutas adicionales...
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    sheets: sheetsEnabled ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString()
  });
});

app.get("/cors-test", (req, res) => {
  res.json({ 
    message: "CORS funcionando correctamente",
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// ✅ Manejo global de errores
app.use((error, req, res, next) => {
  console.error("🔥 Error global no manejado:", error);
  res.status(500).json({
    success: false,
    error: "Error interno del servidor"
  });
});

// Iniciar servidor en desarrollo
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`✅ Health: http://localhost:${PORT}/health`);
    console.log(`✅ CORS Test: http://localhost:${PORT}/cors-test`);
  });
}

module.exports = app;