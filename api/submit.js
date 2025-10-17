// /api/submit.js
const serverless = require('serverless-http');
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleAuth } = require('google-auth-library');

const app = express();

// --- Configuración CORS ---
const allowedOrigins = [
  "https://fwg-apply-form.vercel.app",
  "https://fwg-form-test.vercel.app",
  "https://thefreewebsiteguys.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"]
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// --- Google Sheets setup ---
let sheets;
let sheetsEnabled = false;

async function initializeSheets() {
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
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheets = google.sheets({ version: "v4", auth });

    const testResponse = await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    console.log(`✅ Conectado a Google Sheets: ${testResponse.data.properties.title}`);
    sheetsEnabled = true;
  } catch (error) {
    console.error("❌ Error inicializando Google Sheets:", error.message);
    sheetsEnabled = false;
  }
}

// Inicializa en cold start
initializeSheets();

// --- Funciones auxiliares ---
function validateApplicationData(application) {
  const errors = [];
  if (!application?.first_name?.trim()) errors.push("El nombre es requerido");
  if (!application?.email_address?.trim()) errors.push("El email es requerido");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email_address))
    errors.push("El formato del email es inválido");
  if (!application?.project_description?.trim()) errors.push("La descripción del proyecto es requerida");
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
  if (!sheetsEnabled) throw new Error("Google Sheets API no está habilitada");
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Hoja 1!A:AZ`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
    console.log(`✅ Datos guardados en fila: ${response.data.updates?.updatedRange}`);
    return response;
  } catch (error) {
    console.error("❌ Error guardando en Sheets:", error.message);
    if (error.response) console.error("Detalles del error:", error.response.data);
    throw error;
  }
}

// --- Logging middleware ---
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// --- Rutas ---
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.status(200).end();
});

app.post("/", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    const { application, metadata } = req.body;
    if (!application) return res.status(400).json({ success: false, error: "Datos de aplicación requeridos" });

    const errors = validateApplicationData(application);
    if (errors.length > 0) return res.status(400).json({ success: false, error: "Datos inválidos", details: errors });

    if (!sheetsEnabled) await initializeSheets();
    if (!sheetsEnabled) return res.status(503).json({ success: false, error: "Sheets API no disponible" });

    const row = prepareRow(application, metadata);
    await saveToSheets(row);

    return res.status(200).json({ success: true, message: "Datos guardados exitosamente", timestamp: new Date().toISOString() });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

app.get("/health", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.json({ status: "OK", sheets: sheetsEnabled ? "CONNECTED" : "DISCONNECTED" });
});

// --- Exportar para Vercel ---
module.exports = app;
module.exports.handler = serverless(app);
