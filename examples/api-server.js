/**
 * Ejemplo: API Express para generar liquidaciones bajo demanda
 * 
 * Uso:
 * 1. npm install express
 * 2. node examples/api-server.js
 * 3. POST http://localhost:3000/api/liquidacion
 * 
 * Body (JSON):
 * {
 *   "periodo": "abril de 2025",
 *   "empleado": {...},
 *   ... (ver examples/example.js)
 * }
 */

const express = require('express');
const { generateLiquidacionPDF } = require('../src/index.js');
const { validateLiquidacionData } = require('../src/utils.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// CORS básico
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ============================================================================
// RUTAS
// ============================================================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Generador de Liquidaciones Talana',
  });
});

/**
 * Generar liquidación
 * POST /api/liquidacion
 * 
 * Response:
 * {
 *   success: true,
 *   documentId: "ID para consultar en Firestore",
 *   firestoreDocId: "ID del documento Firestore",
 *   fileName: "nombre del PDF",
 *   firestoreData: { ... datos guardados ... }
 * }
 */
app.post('/api/liquidacion', async (req, res) => {
  try {
    console.log('📨 Solicitud recibida:', req.ip);

    // 1. Validar datos de entrada
    const validation = validateLiquidacionData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: validation.errors,
      });
    }

    // 2. Generar PDF y guardar en Firestore
    console.log(`📄 Generando liquidación para: ${req.body.empleado.nombre}`);
    const result = await generateLiquidacionPDF(req.body);

    // 3. Retornar respuesta con nuevo formato
    res.status(201).json({
      success: true,
      message: 'Liquidación generada exitosamente',
      data: {
        documentId: result.documentId,
        firestoreDocId: result.firestoreDocId,
        fileName: result.fileName,
        firestoreData: result.firestoreData,
        // Opcional: si guardas el PDF en servidor
        pdfUrl: `/pdfs/${result.fileName}`,
      },
    });
  } catch (error) {
    console.error('❌ Error generando liquidación:', error.message);

    res.status(500).json({
      error: 'Error al generar liquidación',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Generar múltiples liquidaciones (batch)
 * POST /api/liquidaciones/batch
 * Body: { liquidaciones: [...] }
 * 
 * Response compacta con Firestore IDs
 */
app.post('/api/liquidaciones/batch', async (req, res) => {
  try {
    const { liquidaciones } = req.body;

    if (!Array.isArray(liquidaciones)) {
      return res.status(400).json({
        error: 'Se requiere un array de liquidaciones',
      });
    }

    console.log(`📦 Procesando ${liquidaciones.length} liquidaciones...`);

    const results = [];
    const errors = [];

    for (let i = 0; i < liquidaciones.length; i++) {
      try {
        const validation = validateLiquidacionData(liquidaciones[i]);
        if (!validation.valid) {
          errors.push({
            index: i,
            error: 'Datos inválidos',
            details: validation.errors,
          });
          continue;
        }

        const result = await generateLiquidacionPDF(liquidaciones[i]);
        results.push({
          index: i,
          success: true,
          documentId: result.documentId,
          firestoreDocId: result.firestoreDocId,
          fileName: result.fileName,
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: errors.length === 0,
      totalProcessed: liquidaciones.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Error en procesamiento batch:', error.message);

    res.status(500).json({
      error: 'Error en procesamiento batch',
      message: error.message,
    });
  }
});

/**
 * Documentación de API
 */
app.get('/api/docs', (req, res) => {
  res.json({
    service: 'Generador de Liquidaciones Talana v2.0',
    version: '2.0.0',
    architecture: 'Firestore + QR Dinámico',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Verificar estado del servicio',
      },
      {
        method: 'POST',
        path: '/api/liquidacion',
        description: 'Generar una liquidación',
        body: 'Objeto con estructura descrita en README.md',
        response: {
          success: 'boolean',
          documentId: 'ID para consultar en Firestore',
          firestoreDocId: 'ID del documento Firestore',
          fileName: 'Nombre del archivo PDF',
          firestoreData: 'Datos guardados en Firestore',
          pdfUrl: 'URL relativa del PDF (si se guarda)',
        },
        example: {
          request: '/api/liquidacion (POST)',
          response: {
            success: true,
            documentId: '1710435022-a1b2c3d4',
            firestoreDocId: 'ABC123XYZ...',
            fileName: 'liquidacion-11153434-3-1710435022-a1b2c3d4.pdf',
            pdfUrl: '/pdfs/liquidacion-...',
          },
        },
      },
      {
        method: 'POST',
        path: '/api/liquidaciones/batch',
        description: 'Generar múltiples liquidaciones',
        body: {
          liquidaciones: ['array de objetos'],
        },
      },
    ],
    notes: [
      'v2.0 usa Firestore en lugar de Storage (Plan Spark gratis)',
      'QR se genera dinámicamente en el frontend',
      'Ver examples/frontend-qr-viewer.html para interfaz',
      'Ver FIRESTORE-GUIDE.md para documentación',
    ],
  });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message,
  });
});

// ============================================================================
// INICIACIÓN
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  🚀 Servidor de Liquidaciones - RUNNING`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📍 Server: http://localhost:${PORT}`);
  console.log(`📚 Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health\n`);
  console.log('Listo para recibir solicitudes...\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 Recibida señal SIGTERM. Cerrando servidor gracefully...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
