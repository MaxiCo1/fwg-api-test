// /api/submit.js
const serverless = require('serverless-http');
const express = require('express');
const bodyParser = require('body-parser');

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

// CORS middleware mejorado
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://thefreewebsiteguys.com");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Logging mejorado
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// POST /api/submit con timeout
app.post("/", async (req, res) => {
  // Set timeout para evitar que se cuelgue
  req.setTimeout(10000, () => {
    console.log('Timeout en request');
  });
  
  try {
    const { application, metadata } = req.body;
    
    if (!application) {
      return res.status(400).json({ 
        success: false, 
        error: "Datos de aplicación requeridos" 
      });
    }

    // Validación de campos requeridos
    const errors = [];
    if (!application.first_name?.trim()) errors.push("El nombre es requerido");
    if (!application.email_address?.trim()) errors.push("El email es requerido");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email_address))
      errors.push("Formato de email inválido");
    if (!application.project_description?.trim()) errors.push("La descripción del proyecto es requerida");

    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Datos inválidos", 
        details: errors 
      });
    }

    // Importación dinámica para mejor manejo de errores
    const SubmitService = require('../services/SubmitService');
    
    await SubmitService.pasteSubmitInSpreadsheet({ application, metadata });

    return res.status(200).json({ 
      success: true, 
      message: "Datos guardados exitosamente" 
    });
    
  } catch (err) {
    console.error("❌ Error interno en /api/submit:", err);
    
    // Error más específico
    let errorMessage = "Error interno del servidor";
    if (err.message.includes('quota')) {
      errorMessage = "Servicio temporalmente no disponible";
    } else if (err.message.includes('auth')) {
      errorMessage = "Error de autenticación";
    }
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// Health check simple
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

// Export con configuración para serverless
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
  request: function(request, event, context) {
    request.context = context;
  }
});

module.exports = handler;