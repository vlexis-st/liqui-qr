const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ============================================================================
// CONFIGURAR CORS
// ============================================================================

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// INICIALIZAR FIREBASE ADMIN
// ============================================================================

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(express.static(path.join(__dirname, 'examples')));
// Servir PDFs desde la carpeta output
app.use('/pdfs', express.static(path.join(__dirname, 'output')));

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/doc/:docId - Obtener documento de Firestore
 */
app.get('/api/doc/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    
    if (!docId) {
      return res.status(400).json({ error: 'Document ID requerido' });
    }

    console.log(`📖 Buscando documento: ${docId}`);

    const docRef = db.collection('registros_qr').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log(`❌ Documento no encontrado: ${docId}`);
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    console.log(`✅ Documento encontrado: ${docId}`);

    const docData = docSnap.data();
    const pdfUrl = docData.fileName ? `/pdfs/${docData.fileName}` : null;

    return res.json({
      id: docSnap.id,
      data: docData,
      pdfUrl: pdfUrl,
    });
  } catch (error) {
    console.error('❌ Error en GET /api/doc/:docId:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /qr/:docId - Resolver QR y redirigir al PDF
 */
app.get('/qr/:docId', async (req, res) => {
  try {
    const { docId } = req.params;

    if (!docId) {
      return res.status(400).send('Document ID requerido');
    }

    // 1) Intentar por ID interno de Firestore
    let docData = null;
    const directRef = db.collection('registros_qr').doc(docId);
    const directSnap = await directRef.get();

    if (directSnap.exists) {
      docData = directSnap.data();
    } else {
      // 2) Fallback: buscar por campo documentId (el que va en el QR)
      const querySnap = await db
        .collection('registros_qr')
        .where('documentId', '==', docId)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        docData = querySnap.docs[0].data();
      }
    }

    if (!docData) {
      return res.status(404).send('Documento no encontrado');
    }

    if (!docData.fileName) {
      return res.status(404).send('PDF no disponible para este documento');
    }

    return res.redirect(`/pdfs/${docData.fileName}`);
  } catch (error) {
    console.error('❌ Error en GET /qr/:docId:', error.message);
    return res.status(500).send('Error interno del servidor');
  }
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '✅ Servidor funcionando' });
});

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

app.use((err, req, res, next) => {
  console.error('❌ Error del servidor:', err);
  res.status(500).json({ error: err.message });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, HOST, () => {
  const publicUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  ✅ SERVIDOR FUNCIONANDO                               ║
║                                                          ║
║  📍 URL: http://localhost:${PORT}/frontend-qr-viewer.html║
║  🌍 PUBLIC_BASE_URL: ${publicUrl.padEnd(33, ' ')}║
║  🔧 API: http://localhost:${PORT}/api/doc/:docId       ║
║  ❤️  Health: http://localhost:${PORT}/health           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
