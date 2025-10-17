// /api/health.js
const serverless = require('serverless-http');
const express = require('express');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const cors = require('cors');

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
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// --- Google Sheets setup ---
let sheetsEnabled = false;

async function checkSheets() {
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

    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    sheetsEnabled = true;
  } catch (error) {
    console.error("❌ Sheets API not available:", error.message);
    sheetsEnabled = false;
  }
}

// --- Endpoint Health ---
app.get("/", async (req, res) => {
  await checkSheets();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.status(200).json({
    status: "OK",
    sheets: sheetsEnabled ? "CONNECTED" : "DISCONNECTED"
  });
});

module.exports = app;
module.exports.handler = serverless(app);
