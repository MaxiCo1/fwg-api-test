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


// /api/submit.js - Solo la parte del POST endpoint
app.post("/", async (req, res) => {
  console.log('🟡 Received POST to /api/submit');
  
  try {
    const { application, metadata } = req.body;
    console.log('📦 Body received:', { 
      hasApplication: !!application,
      hasMetadata: !!metadata,
      email: application?.email_address 
    });

    if (!application) {
      console.log('❌ No application data');
      return res.status(400).json({ 
        success: false, 
        error: "Datos de aplicación requeridos" 
      });
    }

    // Validación
    const errors = [];
    if (!application.first_name?.trim()) errors.push("El nombre es requerido");
    if (!application.email_address?.trim()) errors.push("El email es requerido");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email_address))
      errors.push("Formato de email inválido");
    if (!application.project_description?.trim()) errors.push("La descripción del proyecto es requerida");

    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      return res.status(400).json({ 
        success: false, 
        error: "Datos inválidos", 
        details: errors 
      });
    }

    console.log('✅ Validación pasada, llamando SubmitService...');
    
    // Importación aquí para mejor debugging
    const SubmitService = require('../services/SubmitService');
    await SubmitService.pasteSubmitInSpreadsheet({ application, metadata });

    console.log('✅ Submit completado exitosamente');
    return res.status(200).json({ 
      success: true, 
      message: "Datos guardados exitosamente" 
    });
    
  } catch (err) {
    console.error('❌ Error general en /api/submit:');
    console.error('📌 Error message:', err.message);
    console.error('📌 Error stack:', err.stack);
    
    let errorMessage = "Error interno del servidor";
    let statusCode = 500;

    if (err.message.includes('quota')) {
      errorMessage = "Límite de cuota excedido. Intente más tarde.";
    } else if (err.message.includes('auth')) {
      errorMessage = "Error de autenticación con Google Sheets";
    } else if (err.message.includes('PERMISSION_DENIED')) {
      errorMessage = "Sin permisos para acceder a la hoja de cálculo";
      statusCode = 403;
    } else if (err.message.includes('SPREADSHEET_NOT_FOUND')) {
      errorMessage = "Hoja de cálculo no encontrada";
      statusCode = 404;
    }

    return res.status(statusCode).json({ 
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