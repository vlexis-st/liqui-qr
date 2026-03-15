const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ============================================================================
// INICIALIZACIÓN FIREBASE
// ============================================================================

/**
 * Inicializa Firebase Admin SDK (v2.0: Solo Firestore, sin Storage)
 */
function initializeFirebase() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  return admin;
}

/**
 * Obtiene la URL pública base para construir el enlace del QR.
 * Requiere PUBLIC_BASE_URL en producción.
 */
function resolvePublicBaseUrl() {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (process.env.ALLOW_LOCAL_QR === 'true') {
    const port = process.env.PORT || 3000;
    return `http://localhost:${port}`;
  }

  throw new Error(
    'PUBLIC_BASE_URL no está configurada. Define PUBLIC_BASE_URL con tu dominio público (ej: https://liqui-qr.onrender.com).'
  );
}

// ============================================================================
// GENERADOR DE HTML PARA LIQUIDACIÓN
// ============================================================================

/**
 * Genera el HTML pixel-perfect para la liquidación de Talana
 * El QR se genera dinámicamente en el frontend a partir de los datos en Firestore
 * @param {Object} data - Datos de la liquidación
 * @param {string} documentId - ID del documento en Firestore
 * @returns {string} HTML completo
 */
function generateHTML(data, documentId, qrDataUrl = null) {
  const {
    empleado,
    empresa,
    periodo,
    diasTrabajados,
    diasLicencia,
    diasAusencia,
    horasBase,
    haberes,
    descuentos,
    otros,
  } = data;

  // Cálculos totales
  const totalHaberes = Object.values(haberes).reduce((sum, val) => sum + val, 0);
  const totalDescuentos = Object.values(descuentos).reduce((sum, val) => sum + val, 0);
  const totalOtros = Object.values(otros).reduce((sum, val) => sum + val, 0);
  const alcanceLiquido = totalHaberes - totalDescuentos - totalOtros;

  // Función auxiliar para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyShort = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value).replace('CLP\u00A0', '').trim();
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Liquidación de Remuneraciones</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          font-family: 'Arial', sans-serif;
          color: #333333;
          background: white;
          width: 100%;
          height: 100%;
        }

        .container {
          width: 210mm;
          height: 297mm;
          margin: 0;
          padding: 12mm 12mm 50mm 12mm;
          background: white;
          position: relative;
          font-size: 11px;
          line-height: 1.2;
        }

        /* HEADER */
        .header {
          margin-bottom: 4mm;
          padding-bottom: 0;
          border: none;
        }

        .header-title {
          font-size: 20px;
          font-weight: bold;
          color: #333333;
          font-family: Arial, sans-serif;
          margin-bottom: 1.5mm;
        }

        .header-subtitle {
          font-size: 11px;
          font-weight: bold;
          color: #333333;
          font-family: Arial, sans-serif;
          margin-bottom: 3mm;
        }

        /* TWO COLUMN LAYOUT */
        .top-section {
          display: flex;
          gap: 8mm;
          margin-bottom: 3.5mm;
        }

        .column {
          flex: 1;
        }

        .column.left {
          border-left: 2mm solid #b4d5f0;
          padding-left: 3mm;
        }

        .column.right {
          flex: 0 0 auto;
          width: 55%;
        }

        .column.right .info-row {
          margin-bottom: 1.5mm;
        }

        /* INFO BOX */
        .info-box {
          background-color: #d9e9f6;
          padding: 3mm;
          margin-bottom: 3mm;
          border-radius: 1mm;
        }

        .info-label {
          font-weight: bold;
          font-size: 10px;
        }

        .info-value {
          font-weight: normal;
        }

        .info-row {
          font-size: 10px;
          margin-bottom: 2mm;
          line-height: 1.3;
        }

        .employee-name {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 1.5mm;
          color: #333333;
        }

        .info-row {
          font-size: 10px;
          margin-bottom: 1.5mm;
          line-height: 1.1;
          color: #333333;
          font-family: Arial, sans-serif;
        }

        .info-label {
          font-weight: bold;
          display: inline;
          margin-right: 2mm;
        }

        .info-value {
          font-weight: normal;
          display: inline;
        }

        .section-header {
          background-color: #b4d5f0;
          color: #333333;
          font-weight: bold;
          padding: 2.5mm 4mm;
          font-size: 11px;
          border-radius: 0;
          margin-bottom: 2mm;
          border: none;
        }

        /* STATISTICS */
        .stats-container {
          display: flex;
          gap: 3mm;
          margin-bottom: 4mm;
          margin-top: 2mm;
        }

        .stat-box {
          flex: 1;
          background-color: transparent;
          padding: 0;
          text-align: center;
          border-radius: 0;
          border: none;
        }

        .stat-label {
          background-color: #b4d5f0;
          font-size: 9px;
          font-weight: normal;
          padding: 2mm 2mm;
          margin-bottom: 0;
          color: #333333;
          font-family: Arial, sans-serif;
        }

        .stat-value {
          background-color: white;
          font-size: 14px;
          font-weight: bold;
          padding: 2mm 2mm;
          color: #333333;
          font-family: Arial, sans-serif;
        }

        /* MAIN TABLE */
        .main-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
          font-size: 11px;
          table-layout: fixed;
          border: 1px solid #dcdcdc;
        }

        .main-table th {
          background-color: #b4d5f0;
          color: #424242;
          font-weight: bold;
          padding: 2.5mm 3mm;
          text-align: left;
          border: 1px solid #dcdcdc;
          font-size: 11px;
          height: 6.2mm;
          font-family: Arial, sans-serif;
        }

        .main-table td {
          padding: 1.45mm 3mm;
          border: 1px solid #dcdcdc;
          text-align: left;
          vertical-align: middle;
          height: auto;
          word-wrap: break-word;
          overflow-wrap: break-word;
          font-family: Arial, sans-serif;
          color: #333333;
        }

        .main-table .amount {
          text-align: right;
          font-family: Arial, sans-serif;
          padding-right: 3.8mm;
        }

        .subsection-header {
          background-color: #ececec;
          font-weight: bold;
          padding: 1.7mm 3mm !important;
          border: 1px solid #dcdcdc;
          color: #333333;
          font-family: Arial, sans-serif;
          font-size: 11px;
          text-align: left;
        }

        .item-name {
          padding-left: 4mm;
        }

        .totals-row {
          background-color: #ffffff;
          font-weight: bold;
          padding: 1.8mm 3mm !important;
          border: 1px solid #dcdcdc;
          color: #333333;
        }

        .totals-label {
          text-align: right;
          padding-right: 5.2mm !important;
        }

        .totals-row.amount {
          text-align: right;
          font-family: Arial, sans-serif;
          padding-right: 3.8mm;
        }

        /* ALCANCE LIQUIDO */
        .alcance-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
          margin-bottom: 0;
          border: 1px solid #dcdcdc;
        }

        .alcance-table td {
          background-color: #b4d5f0;
          border: 1px solid #dcdcdc;
          color: #333333;
          font-family: Arial, sans-serif;
          padding: 2.2mm 3mm;
        }

        .alcance-label {
          font-weight: bold;
          font-size: 11px;
          text-align: right;
          padding-right: 5.2mm !important;
        }

        .alcance-value {
          font-weight: bold;
          font-size: 11px;
          text-align: right;
          padding-right: 3.8mm !important;
          color: #333333;
          font-family: Arial, sans-serif;
        }

        /* FOOTER */
        .footer {
          position: absolute;
          bottom: 10mm;
          left: 12mm;
          right: 12mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 12mm;
          border-top: 1px solid #cfcfcf;
          height: 56mm;
        }

        .footer-text-section {
          display: flex;
          gap: 3mm;
          align-items: flex-start;
          flex: 1;
        }

        .footer-icon {
          width: 14mm;
          height: 14mm;
          flex-shrink: 0;
        }

        .footer-text {
          font-size: 7.7px;
          line-height: 1.3;
          color: #1f2d4d;
          max-width: 98mm;
        }

        .footer-signature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.6mm;
          flex-shrink: 0;
          margin: 0 4mm 0 4mm;
        }

        .signature-line {
          width: 38mm;
          border-top: 1.4px solid #333333;
        }

        .signature-label {
          font-size: 8px;
          font-weight: bold;
          color: #1f2d4d;
        }

        .footer-qr {
          width: 18mm;
          height: 18mm;
          border: 1px solid #666666;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .footer-qr img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .generated-by {
          font-size: 8px;
          color: #7d7d7d;
          margin-top: 1.2mm;
          text-align: left;
          font-weight: 600;
        }

        @media print {
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }
          .container {
            margin: 0;
            padding: 12mm 12mm 50mm 12mm;
            width: 210mm;
            height: 297mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- HEADER -->
        <div class="header">
          <div>
            <div class="header-title">Liquidación de Remuneraciones</div>
            <div class="header-subtitle">Mes: ${periodo}</div>
          </div>
        </div>

        <!-- TOP SECTION: EMPLOYEE AND COMPANY INFO -->
        <div class="top-section">
          <!-- LEFT: EMPLOYEE INFO -->
          <div class="column left">
            <div class="employee-name">${empleado.nombre}</div>
            <div class="info-row"><span class="info-label">Rut:</span> <span class="info-value">${empleado.rut}</span></div>
            <div class="info-row"><span class="info-label">Fecha de Ingreso:</span> <span class="info-value">${empleado.fechaIngreso}</span></div>
            <div class="info-row"><span class="info-label">Cargo:</span> <span class="info-value">${empleado.cargo}</span></div>
            <div class="info-row"><span class="info-label">C. Costo:</span> <span class="info-value">${empleado.centroCosto}</span></div>
            <div class="info-row"><span class="info-label">Codigo:</span> <span class="info-value">${empleado.codigo}</span></div>
          </div>

          <!-- RIGHT: COMPANY INFO -->
          <div class="column right">
            <div class="section-header">INFORMACIÓN EMPRESA</div>
            <div class="info-row"><span class="info-label">Razón Social:</span> <span class="info-value">${empresa.razonSocial}</span></div>
            <div class="info-row"><span class="info-label">Rut:</span> <span class="info-value">${empresa.rut}</span></div>
            <div class="info-row"><span class="info-label">Sucursal:</span> <span class="info-value">${empresa.sucursal}</span></div>
          </div>
        </div>

        <!-- STATISTICS -->
        <div class="stats-container">
          <div class="stat-box">
            <div class="stat-label">Días Trabajados:</div>
            <div class="stat-value">${diasTrabajados.toFixed(1)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Días Licencia</div>
            <div class="stat-value">${diasLicencia}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Días Ausencia</div>
            <div class="stat-value">${diasAusencia}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Horas Base</div>
            <div class="stat-value">${horasBase.toFixed(1)}</div>
          </div>
        </div>

        <!-- MAIN TABLE -->
        <table class="main-table">
          <colgroup>
            <col style="width: 50%;">
            <col style="width: 25%;">
            <col style="width: 25%;">
          </colgroup>
          <thead>
            <tr>
              <th>Detalle</th>
              <th class="amount">Haberes</th>
              <th class="amount">Descuentos</th>
            </tr>
          </thead>
          <tbody>
            <!-- HABERES SECTION -->
            <tr>
              <td colspan="3" class="subsection-header">Haberes</td>
            </tr>
            ${Object.entries(haberes).map(([concepto, monto]) => `
              <tr>
                <td class="item-name">${concepto}</td>
                <td class="amount">${formatCurrencyShort(monto)}</td>
                <td class="amount"></td>
              </tr>
            `).join('')}

            <!-- DESCUENTOS LEGALES SECTION -->
            <tr>
              <td colspan="3" class="subsection-header">Descuentos Legales</td>
            </tr>
            ${Object.entries(descuentos).map(([concepto, monto]) => `
              <tr>
                <td class="item-name">${concepto}</td>
                <td class="amount"></td>
                <td class="amount">${formatCurrencyShort(monto)}</td>
              </tr>
            `).join('')}

            <!-- OTROS DESCUENTOS SECTION -->
            <tr>
              <td colspan="3" class="subsection-header">Otros Descuentos</td>
            </tr>
            ${Object.entries(otros).length > 0 ? Object.entries(otros).map(([concepto, monto]) => `
              <tr>
                <td class="item-name">${concepto}</td>
                <td class="amount"></td>
                <td class="amount">${formatCurrencyShort(monto)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td class="item-name"></td>
                <td class="amount"></td>
                <td class="amount"></td>
              </tr>
            `}

            <!-- TOTALS ROW -->
            <tr>
              <td class="totals-row totals-label">Totales:</td>
              <td class="totals-row amount">${formatCurrencyShort(totalHaberes)}</td>
              <td class="totals-row amount">${formatCurrencyShort(totalDescuentos + totalOtros)}</td>
            </tr>
          </tbody>
        </table>

        <!-- ALCANCE LIQUIDO -->
        <table class="alcance-table">
          <colgroup>
            <col style="width: 50%;">
            <col style="width: 25%;">
            <col style="width: 25%;">
          </colgroup>
          <tbody>
            <tr>
              <td></td>
              <td class="alcance-label">ALCANCE LÍQUIDO:</td>
              <td class="alcance-value">${formatCurrencyShort(alcanceLiquido)}</td>
            </tr>
          </tbody>
        </table>

        <!-- GENERATED BY -->
        <div class="generated-by">Liquidación generada automáticamente por TALANA.com</div>

        <!-- FOOTER -->
        <div class="footer">
          <div class="footer-text-section">
            <div class="footer-icon">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#333" stroke-width="3">
                <circle cx="50" cy="50" r="45"/>
                <line x1="50" y1="30" x2="50" y2="52"/>
                <line x1="50" y1="52" x2="32" y2="68"/>
              </svg>
            </div>
            <div class="footer-text">
              Certifico que he recibido a mi entera satisfacción la suma de ${formatCurrency(alcanceLiquido)} indicada en la presente liquidación, y no tengo cargo ni cobro posterior que hacer por los conceptos de esta liquidación.
            </div>
          </div>

          <div class="footer-signature">
            <div class="signature-line"></div>
            <div class="signature-label">Vº Bº.</div>
          </div>

          <div class="footer-qr" id="qr-container-${documentId}">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR"/>` : `
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333">
                <rect x="10" y="10" width="20" height="20"/>
                <rect x="40" y="10" width="20" height="20"/>
                <rect x="70" y="10" width="20" height="20"/>
                <rect x="10" y="40" width="20" height="20"/>
                <rect x="40" y="40" width="20" height="20"/>
                <rect x="70" y="40" width="20" height="20"/>
                <rect x="10" y="70" width="20" height="20"/>
                <rect x="40" y="70" width="20" height="20"/>
                <rect x="70" y="70" width="20" height="20"/>
              </svg>
            `}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// GENERADOR DE PDF CON QR
// ============================================================================

/**
 * DEPRECATED - El QR se genera ahora dinámicamente en el frontend
 * desde los datos guardados en Firestore
 * 
 * Esta función se mantiene solo para compatibilidad hacia atrás
 * @param {string} url - URL a codificar
 * @returns {Promise<string>} QR en base64
 */
async function generateQRCode(url) {
  try {
    const qrBase64 = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 0,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrBase64;
  } catch (error) {
    throw new Error(`Error generando QR: ${error.message}`);
  }
}

/**
 * Genera un PDF a partir de HTML usando Puppeteer
 * @param {string} html - HTML del documento
 * @returns {Promise<Buffer>} Buffer del PDF
 */
async function generatePDFBuffer(html) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      printBackground: true,
      scale: 1,
    });

    return pdfBuffer;
  } catch (error) {
    throw new Error(`Error generando PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ============================================================================
// INTEGRACIÓN FIREBASE
// ============================================================================

// ============================================================================
// INTEGRACIÓN FIRESTORE
// ============================================================================

/**
 * Guarda los datos del QR en Firestore
 * El documento contiene la URL/ID que el frontend usará para generar el QR
 * @param {Object} qrData - Datos a guardar para el QR
 * @returns {Promise<string>} ID del documento creado
 */
async function saveQRDataToFirestore(qrData) {
  try {
    const db = admin.firestore();
    const collectionName = process.env.FIRESTORE_COLLECTION_NAME || 'registros_qr';

    const documentData = {
      ...qrData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
    };

    const docRef = await db.collection(collectionName).add(documentData);

    console.log(`✅ Datos QR guardados en Firestore (ID: ${docRef.id})`);
    return docRef.id;
  } catch (error) {
    throw new Error(`Error guardando en Firestore: ${error.message}`);
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Genera una liquidación completa con datos guardados en Firestore
 * El QR se genera dinámicamente en el frontend desde los datos de Firestore
 * @param {Object} data - Datos de la liquidación
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.saveToFile - Guardar PDF a archivo local (default: true)
 * @param {string} options.outputDir - Directorio de salida (default: './output')
 * @returns {Promise<{documentId: string, pdfBuffer: Buffer, fileName: string, firestoreData: Object}>}
 */
async function generateLiquidacionPDF(data, options = {}) {
  const { saveToFile = true, outputDir = './output' } = options;

  try {
    // Inicializar Firebase
    initializeFirebase();

    // 1. Generar ID único del documento
    const documentId = `${Date.now()}-${uuidv4().substring(0, 8)}`;
    const fileName = `liquidacion-${data.empleado.rut.replace(/\D/g, '')}-${documentId}.pdf`;

    console.log('📄 1. Generando ID único:', documentId);

    // 2. Generar contenido QR y HTML
    console.log('📄 2. Generando HTML...');
    const publicBaseUrl = resolvePublicBaseUrl();
    const qrUrl = `${publicBaseUrl}/qr/${documentId}`;
    const qrContent = {
      documentId,
      empleado: data.empleado.nombre,
      rut: data.empleado.rut,
      periodo: data.periodo,
      timestamp: new Date().toISOString(),
      url: qrUrl,
    };
    const qrDataUrl = await generateQRCode(qrUrl);
    const html = generateHTML(data, documentId, qrDataUrl);

    // 3. Renderizar HTML a PDF
    console.log('📄 3. Renderizando PDF con Puppeteer...');
    const pdfBuffer = await generatePDFBuffer(html);

    // 4. Preparar datos para Firestore
    console.log('📄 4. Preparando datos para Firestore...');
    const firestoreData = {
      documentId,
      fileName,
      rut: data.empleado.rut,
      nombreEmpleado: data.empleado.nombre,
      periodo: data.periodo,
      razonSocial: data.empresa.razonSocial,
      // Información completa para que el frontend pueda generar el QR
      qrContent,
      qrUrl,
    };

    // 5. Guardar en Firestore
    console.log('📄 5. Guardando datos en Firestore...');
    const firestoreDocId = await saveQRDataToFirestore(firestoreData);

    // 6. Guardar PDF a archivo local si se solicita
    let savedPath = null;
    if (saveToFile) {
      const fs = require('fs').promises;
      const path = require('path');

      try {
        // Crear directorio si no existe
        await fs.mkdir(outputDir, { recursive: true });
        savedPath = path.join(outputDir, fileName);
        await fs.writeFile(savedPath, pdfBuffer);
        console.log(`📄 6. PDF guardado localmente: ${savedPath}`);
      } catch (error) {
        console.warn(`⚠️ No se pudo guardar PDF localmente: ${error.message}`);
      }
    }

    console.log('✅ Liquidación generada correctamente');
    console.log(`📍 DocumentID Firestore: ${firestoreDocId}`);

    return {
      documentId,
      firestoreDocId,
      fileName,
      pdfBuffer,
      savedPath,
      firestoreData,
    };
  } catch (error) {
    console.error('❌ Error en generateLiquidacionPDF:', error.message);
    throw error;
  }
}

// ============================================================================
// EXPORTAR
// ============================================================================

module.exports = {
  generateLiquidacionPDF,
  generateHTML,
  generateQRCode,
  generatePDFBuffer,
  saveQRDataToFirestore,
  initializeFirebase,
};
