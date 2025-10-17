const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleAuth } = require('google-auth-library');

// ✅ Cargar variables .env en todos los entornos para consistencia
require('dotenv').config();

const app = express();

// Configuración CORS actualizada con las URLs correctas
const corsOptions = {
  origin: [
    "http://127.0.0.1:5500", 
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://thefreewebsiteguys.com",
    "https://fwg-api-test.vercel.app",
    "https://fwg-form-test.vercel.app",
    "https://fwg-apply-form.vercel.app" // ✅ Nueva URL del frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// Manejar preflight requests explícitamente para todas las rutas
app.options('*', cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de Google Sheets
let sheets;
let sheetsEnabled = false;

async function initializeSheets() {
  try {
    console.log("🔄 Initializing Google Sheets API...");
    console.log("📋 Environment:", process.env.NODE_ENV);
    console.log("📧 Client Email:", process.env.GOOGLE_CLIENT_EMAIL);
    
    // ✅ Manejo robusto de la clave privada
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ?.replace(/\\n/g, '\n')
      ?.replace(/\\\\n/g, '\n')
      ?.replace(/"/g, '');
    
    if (!privateKey) {
      throw new Error("GOOGLE_PRIVATE_KEY is not defined");
    }

    const auth = new GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: process.env.GOOGLE_AUTH_URI,
        token_uri: process.env.GOOGLE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
        client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
        universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheets = google.sheets({ version: "v4", auth });
    
    // Test connection
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID
    });
    
    sheetsEnabled = true;
    console.log("✅ Google Sheets API configured successfully");
  } catch (error) {
    console.error("❌ Google Sheets API initialization failed:", error.message);
    sheetsEnabled = false;
  }
}

initializeSheets();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "Hoja 1";

function prepareRow(application, metadata) {
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
    new Date().toISOString(),
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
  if (!sheetsEnabled || !sheets) {
    throw new Error("Google Sheets API not enabled");
  }

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { 
      values: [row] 
    },
  });

  return response;
}

// Middleware para headers CORS - Configuración simplificada
app.use((req, res, next) => {
  const allowedOrigins = [
    // ✅ Tu único frontend en producción
    "https://fwg-apply-form.vercel.app",
    
    // ✅ URLs de desarrollo local
    "http://localhost:3000", 
    "http://localhost:5173",
    "http://127.0.0.1:5500"
  ];
  
  const origin = req.headers.origin;
  
  // Permitir solo los orígenes específicos de la lista
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  // En desarrollo, puedes ser más permisivo si es necesario
  else if (process.env.NODE_ENV === 'development' && origin) {
    console.log(`⚠️  Allowing non-listed origin in development: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log(`🛫 Handling OPTIONS preflight from: ${origin}`);
    return res.status(200).end();
  }
  
  next();
});

app.post("/submit", async (req, res) => {
  try {
    console.log("📨 Received submission request");
    console.log("🌐 Origin:", req.headers.origin);
    console.log("📧 User Agent:", req.headers['user-agent']);
    console.log("🔧 Method:", req.method);
    
    const { application, metadata } = req.body;

    if (!application) {
      return res.status(400).json({ 
        success: false, 
        error: "Application data is required" 
      });
    }

    console.log("📝 Application data:", {
      project_description: application.project_description,
      first_name: application.first_name,
      email: application.email_address,
      completed: application.completed
    });

    if (!sheetsEnabled) {
      console.log("❌ Sheets API not enabled");
      return res.status(503).json({ 
        success: false, 
        error: "Service temporarily unavailable" 
      });
    }

    const row = prepareRow(application, metadata);
    await saveToSheets(row);

    console.log("✅ Data saved successfully to Google Sheets");
    res.status(200).json({ 
      success: true, 
      message: "Data saved successfully",
      environment: process.env.NODE_ENV || 'local',
      frontend_origin: req.headers.origin
    });

  } catch (err) {
    console.error("❌ Error saving to Sheets:", err.message);
    res.status(500).json({ 
      success: false, 
      error: "Failed to save data",
      details: err.message,
      frontend_origin: req.headers.origin
    });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    sheets_api: sheetsEnabled ? "ENABLED" : "DISABLED",
    environment: process.env.NODE_ENV || 'local',
    timestamp: new Date().toISOString(),
    allowed_origins: [
      "https://fwg-apply-form.vercel.app",
      "https://fwg-form-test.vercel.app",
      "https://thefreewebsiteguys.com"
    ],
    backend_url: "https://fwg-api-test.vercel.app"
  });
});

// Ruta específica para testing CORS
app.get("/cors-test", (req, res) => {
  res.status(200).json({ 
    message: "CORS test successful",
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    cors: "enabled",
    frontend_url: "https://fwg-apply-form.vercel.app",
    backend_url: "https://fwg-api-test.vercel.app"
  });
});

// Ruta OPTIONS específica para /submit
app.options("/submit", (req, res) => {
  console.log("🛫 Handling OPTIONS preflight for /submit from:", req.headers.origin);
  res.status(200).end();
});

app.all('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: "Route not found",
    allowed_routes: ["/submit", "/health", "/cors-test"],
    frontend_url: "https://fwg-apply-form.vercel.app",
    backend_url: "https://fwg-api-test.vercel.app"
  });
});

// ✅ Iniciar servidor solo en local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 CORS test: http://localhost:${PORT}/cors-test`);
    console.log(`✅ Allowing CORS for: https://fwg-apply-form.vercel.app`);
    console.log(`✅ Backend URL: https://fwg-api-test.vercel.app`);
  });
}

// ✅ Export para Vercel
module.exports = app;