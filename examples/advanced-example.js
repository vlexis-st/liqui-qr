const { generateLiquidacionPDF } = require('../src/index.js');
const {
  validateLiquidacionData,
  formatRUT,
  calculateTotals,
} = require('../src/utils.js');

// ============================================================================
// EJEMPLO AVANZADO CON VALIDACIÓN
// ============================================================================

/**
 * Datos de liquidación con validación completa
 */
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
// FUNCIÓN PRINCIPAL CON VALIDACIONES
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 GENERADOR DE LIQUIDACIONES TALANA - EJEMPLO AVANZADO    ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Validar datos
    console.log('📋 1. Validando datos de entrada...');
    const validation = validateLiquidacionData(liquidacionData);

    if (!validation.valid) {
      console.error('❌ Errores de validación:');
      validation.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }
    console.log('   ✅ Datos válidos\n');

    // 2. Mostrar resumen
    console.log('📊 2. Resumen de liquidación:');
    const totals = calculateTotals(liquidacionData);
    console.log(`   Empleado: ${liquidacionData.empleado.nombre}`);
    console.log(`   RUT: ${formatRUT(liquidacionData.empleado.rut)}`);
    console.log(`   Período: ${liquidacionData.periodo}`);
    console.log(`   Total Haberes: CLP $${totals.totalHaberes.toLocaleString('es-CL')}`);
    console.log(`   Total Descuentos: CLP $${totals.totalDescuentos.toLocaleString('es-CL')}`);
    console.log(
      `   Total Otros: CLP $${totals.totalOtros.toLocaleString('es-CL')}`
    );
    console.log(`   Alcance Líquido: CLP $${totals.alcanceLiquido.toLocaleString('es-CL')}\n`);

    // 3. Generar PDF
    console.log('⚙️  3. Generando PDF...\n');
    const result = await generateLiquidacionPDF(liquidacionData);

    // 4. Mostrar resultado
    console.log('✨ RESULTADO FINAL:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📁 Nombre archivo: ${result.fileName}`);
    console.log(`🆔 ID Documento: ${result.documentId}`);
    console.log(`📂 Path Firebase: ${result.pdfPath}`);
    console.log(`🌐 URL Pública:\n${result.url}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('✅ ¡Liquidación generada exitosamente!');
    console.log('📱 El código QR en el PDF apunta a la URL pública anterior.');
    console.log('📥 El archivo está público en Firebase Storage.\n');

    return result;
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Tipo: ${error.name}`);
    console.error(`Mensaje: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Sugerencias de troubleshooting
    if (error.message.includes('Firebase')) {
      console.error('💡 Sugerencias:');
      console.error('   1. Verifica que .env existe y está configurado correctamente');
      console.error('   2. Verifica que las credenciales de Firebase son válidas');
      console.error('   3. Verifica que el bucket existe y tienes permisos de escritura');
    } else if (error.message.includes('ENOENT')) {
      console.error('💡 El archivo no existe. Verifica las rutas en .env');
    }

    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { main, liquidacionData };
