// /api/submit.js
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const SubmitService = require('../services/SubmitService');

const app = express();

// --- Allowed origins ---
const allowedOrigins = [
  "https://fwg-apply-form.vercel.app",
  "https://fwg-form-test.vercel.app",
  "https://thefreewebsiteguys.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500"
];

// --- Middlewares ---
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Preflight CORS
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "null");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.status(200).end();
});

// POST /api/submit
app.post("/", async (req, res) => {
  try {
    const { application, metadata } = req.body;
    if (!application) return res.status(400).json({ success: false, error: "Datos de aplicación requeridos" });

    const errors = [];
    if (!application.first_name?.trim()) errors.push("El nombre es requerido");
    if (!application.email_address?.trim()) errors.push("El email es requerido");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email_address))
      errors.push("Formato de email inválido");
    if (!application.project_description?.trim()) errors.push("La descripción del proyecto es requerida");

    if (errors.length > 0) return res.status(400).json({ success: false, error: "Datos inválidos", details: errors });

    await SubmitService.pasteSubmitInSpreadsheet({ application, metadata });

    return res.status(200).json({ success: true, message: "Datos guardados exitosamente" });
  } catch (err) {
    console.error("❌ Error interno en /api/submit:", err);
    return res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

module.exports = serverless(app);
