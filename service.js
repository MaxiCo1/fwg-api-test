const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleAuth } = require('google-auth-library');

// ✅ Cargar variables .env en todos los entornos para consistencia
require('dotenv').config();

const app = express();

// Middleware CORS actualizado
app.use(cors({ 
  origin: [
    "http://127.0.0.1:5500", 
    "http://localhost:3000", 
    "https://thefreewebsiteguys.com",
    "https://fwg-api-test.vercel.app",
    "https://fwg-form-test.vercel.app" // ✅ Nueva URL agregada
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Manejar preflight requests explícitamente
app.options('*', cors());

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

app.post("/submit", async (req, res) => {
  // Headers CORS adicionales para esta ruta específica
  res.header('Access-Control-Allow-Origin', 'https://fwg-form-test.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    console.log("📨 Received submission request");
    console.log("🌐 Origin:", req.headers.origin);
    console.log("📧 User Agent:", req.headers['user-agent']);
    
    const { application, metadata } = req.body;

    if (!application) {
      return res.status(400).json({ 
        success: false, 
        error: "Application data is required" 
      });
    }

    if (!sheetsEnabled) {
      console.log("❌ Sheets API not enabled");
      return res.status(503).json({ 
        success: false, 
        error: "Service temporarily unavailable" 
      });
    }

    const row = prepareRow(application, metadata);
    await saveToSheets(row);

    console.log("✅ Data saved successfully");
    res.status(200).json({ 
      success: true, 
      message: "Data saved successfully",
      environment: process.env.NODE_ENV || 'local'
    });

  } catch (err) {
    console.error("❌ Error saving to Sheets:", err.message);
    res.status(500).json({ 
      success: false, 
      error: "Failed to save data",
      details: err.message 
    });
  }
});

app.get("/health", (req, res) => {
  // Headers CORS para health check
  res.header('Access-Control-Allow-Origin', 'https://fwg-form-test.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(200).json({ 
    status: "OK", 
    sheets_api: sheetsEnabled ? "ENABLED" : "DISABLED",
    environment: process.env.NODE_ENV || 'local',
    timestamp: new Date().toISOString(),
    allowed_origins: [
      "https://fwg-form-test.vercel.app",
      "https://thefreewebsiteguys.com"
    ]
  });
});

// Ruta específica para testing CORS
app.get("/cors-test", (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://fwg-form-test.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(200).json({ 
    message: "CORS test successful",
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

app.all('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://fwg-form-test.vercel.app');
  res.status(404).json({ 
    success: false, 
    error: "Route not found",
    allowed_routes: ["/submit", "/health", "/cors-test"] 
  });
});

// ✅ Iniciar servidor solo en local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 CORS test: http://localhost:${PORT}/cors-test`);
    console.log(`✅ Allowing CORS for: https://fwg-form-test.vercel.app`);
  });
}

// ✅ Export para Vercel
module.exports = app;