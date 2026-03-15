const { generateLiquidacionPDF } = require('../src/index.js');

// ============================================================================
// DATOS DE EJEMPLO - LIQUIDACIÓN DE TALANA
// ============================================================================

const liquidacionData = {
  periodo: 'abril de 2025',

  empleado: {
    nombre: 'YORKA CECILIA ALVARADO LOPEZ',
    rut: '11.153.434-3',
    fechaIngreso: '1 de Marzo de 2025',
    cargo: 'Capitán/a (A)',
    centroCosto: 'Lucky 7 - San Francisco de Mostazal',
    codigo: '200104',
  },

  empresa: {
    razonSocial: 'SAN FRANCISCO INVESTMENT S.A.',
    rut: '76291170-5',
    sucursal: 'San Francisco de Mostazal',
  },

  diasTrabajados: 23.0,
  diasLicencia: 7,
  diasAusencia: 0,
  horasBase: 40.0,

  haberes: {
    'Sueldo Base': 448436,
    'Gratificación Manual': 112109,
    'Movilización (Monto Sueldo: $ 28.577)': 21909,
  },

  descuentos: {
    'AFP (Capital: 11.44%; Renta Imponible: $ 560.545)': 64126,
    'Salud 7% (Fonasa)': 39238,
    'Seguro Cesantía Trabajador': 3363,
    'Impuestos (Renta Tributable: $ 453.818)': 0,
  },

  otros: {
    'Seguro Vida Los Andes': 8911,
    'Cuota Sindical Monticallo': 25532,
    'Seguro Falp': 8800,
  },
};

// ============================================================================
// FUNCIÓN PARA EJECUTAR EL EJEMPLO
// ============================================================================

async function main() {
  try {
    console.log('🚀 Iniciando generación de liquidación...\n');

    // Generar liquidación
    // El PDF se guarda en ./output por defecto
    // Los datos del QR se guardan en Firestore
    const result = await generateLiquidacionPDF(liquidacionData);

    console.log('\n✨ Resultado Final:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 Archivo PDF: ${result.fileName}`);
    console.log(`💾 Ubicación: ${result.savedPath || 'En memoria (no guardado)'}`);
    console.log(`🆔 Document ID: ${result.documentId}`);
    console.log(`🔥 Firestore Doc ID: ${result.firestoreDocId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Datos guardados en Firestore:');
    console.log(JSON.stringify(result.firestoreData, null, 2));
    console.log('\n✅ El QR se generará dinámicamente en el frontend');
    console.log('✅ Usa el ejemplo frontend para leer de Firestore\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { liquidacionData, main };
