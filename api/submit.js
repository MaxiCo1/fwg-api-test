// /api/submit.js
const serverless = require('serverless-http');
const express = require('express');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const cors = require('cors');
const bodyParser = require('body-parser');

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
  credentials: true
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
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    sheets = google.sheets({ version: "v4", auth });
    const testResponse = await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    console.log(`✅ Conectado a Google Sheets: ${testResponse.data.properties.title}`);
    sheetsEnabled = true;
  } catch (err) {
    console.error("❌ Error inicializando Sheets:", err.message);
    sheetsEnabled = false;
  }
}

// Inicializa en cold start
initializeSheets();

// --- Funciones auxiliares ---
function validateApplicationData(appData) {
  const errors = [];
  if (!appData?.first_name?.trim()) errors.push("El nombre es requerido");
  if (!appData?.email_address?.trim()) errors.push("El email es requerido");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appData.email_address))
    errors.push("Formato de email inválido");
  if (!appData?.project_description?.trim()) errors.push("La descripción del proyecto es requerida");
  return errors;
}

function prepareRow(appData, metadata) {
  const timestamp = new Date().toISOString();
  return [
    appData.project_description || "",
    appData.first_name || "",
    appData.email_address || "",
    appData.phone_number || "",
    appData.web_hosting || "",
    appData.utm_source || "",
    appData.utm_medium || "",
    appData.utm_campaign || "",
    timestamp,
    metadata?.mobile ? "Mobile" : "Desktop",
    metadata?.userAgent || "",
    appData.fbclid || "",
    appData.gclid || "",
    appData.language || "en"
  ];
}

async function saveToSheets(row) {
  if (!sheetsEnabled) await initializeSheets();
  if (!sheetsEnabled) throw new Error("Sheets API no disponible");

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `Hoja 1!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return response;
}

// --- Logging ---
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// --- Rutas ---
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.status(200).end();
});

// POST /api/submit
app.post("/", async (req, res) => {
  try {
    const { application, metadata } = req.body;
    if (!application) return res.status(400).json({ success: false, error: "Datos de aplicación requeridos" });

    const errors = validateApplicationData(application);
    if (errors.length > 0) return res.status(400).json({ success: false, error: "Datos inválidos", details: errors });

    const row = prepareRow(application, metadata);
    await saveToSheets(row);

    return res.status(200).json({ success: true, message: "Datos guardados exitosamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// --- Exportar ---
module.exports = app;
module.exports.handler = serverless(app);
