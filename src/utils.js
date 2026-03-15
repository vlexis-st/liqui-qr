/**
 * Utilidades para la generación de liquidaciones
 */

/**
 * Valida el formato de RUT chileno
 * @param {string} rut - RUT a validar
 * @returns {boolean}
 */
function isValidRUT(rut) {
  if (!rut || typeof rut !== 'string') return false;

  // Remover puntos y guiones
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');

  // Debe tener 8 o 9 caracteres
  if (cleanRut.length < 8 || cleanRut.length > 9) return false;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();

  // Validar que body sea numérico
  if (!/^\d+$/.test(body)) return false;

  // Calcular dígito verificador
  let multiplier = 2;
  let sum = 0;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDV = (11 - (sum % 11)) % 11;
  const expectedDVChar = expectedDV === 11 ? 'K' : expectedDV.toString();

  return dv === expectedDVChar;
}

/**
 * Formatea un RUT
 * @param {string} rut - RUT sin formato
 * @returns {string} RUT formateado
 */
function formatRUT(rut) {
  if (!rut) return '';

  // Remover caracteres especiales
  const clean = rut.replace(/\D/g, '');

  if (clean.length < 7) return rut;

  // Agregar puntos cada 3 dígitos desde la derecha
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted}-${dv}`;
}

/**
 * Formatea un número como moneda chilena
 * @param {number} value - Valor a formatear
 * @param {boolean} includeSymbol - Incluir símbolo CLP
 * @returns {string}
 */
function formatCLPCurrency(value, includeSymbol = true) {
  if (typeof value !== 'number') value = Number(value);

  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  if (!includeSymbol) {
    return formatted.replace('CLP', '').trim();
  }

  return formatted;
}

/**
 * Valida que los datos de liquidación sean correctos
 * @param {Object} data - Datos a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateLiquidacionData(data) {
  const errors = [];

  if (!data) {
    return { valid: false, errors: ['Datos no proporcionados'] };
  }

  // Validar empleado
  if (!data.empleado) {
    errors.push('Falta objeto "empleado"');
  } else {
    if (!data.empleado.nombre || typeof data.empleado.nombre !== 'string') {
      errors.push('Empleado: nombre requerido');
    }
    if (!data.empleado.rut) {
      errors.push('Empleado: RUT requerido');
    } else if (!isValidRUT(data.empleado.rut)) {
      errors.push('Empleado: RUT inválido');
    }
  }

  // Validar empresa
  if (!data.empresa) {
    errors.push('Falta objeto "empresa"');
  } else {
    if (!data.empresa.razonSocial) {
      errors.push('Empresa: razón social requerida');
    }
    if (!data.empresa.rut) {
      errors.push('Empresa: RUT requerido');
    } else if (!isValidRUT(data.empresa.rut)) {
      errors.push('Empresa: RUT inválido');
    }
  }

  // Validar período
  if (!data.periodo || typeof data.periodo !== 'string') {
    errors.push('Período requerido');
  }

  // Validar números
  if (typeof data.diasTrabajados !== 'number' || data.diasTrabajados < 0) {
    errors.push('diasTrabajados debe ser un número positivo');
  }

  if (typeof data.haberes !== 'object' || Array.isArray(data.haberes)) {
    errors.push('haberes debe ser un objeto');
  }

  if (typeof data.descuentos !== 'object' || Array.isArray(data.descuentos)) {
    errors.push('descuentos debe ser un objeto');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calcula los totales de una liquidación
 * @param {Object} data - Datos de liquidación
 * @returns {Object} { totalHaberes, totalDescuentos, totalOtros, alcanceLiquido }
 */
function calculateTotals(data) {
  const totalHaberes = Object.values(data.haberes || {}).reduce((sum, val) => sum + val, 0);
  const totalDescuentos = Object.values(data.descuentos || {}).reduce((sum, val) => sum + val, 0);
  const totalOtros = Object.values(data.otros || {}).reduce((sum, val) => sum + val, 0);

  return {
    totalHaberes,
    totalDescuentos,
    totalOtros,
    alcanceLiquido: totalHaberes - totalDescuentos - totalOtros,
  };
}

/**
 * Convierte una imagen a base64
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string>} Base64 de la imagen
 */
async function imageToBase64(filePath) {
  const fs = require('fs').promises;
  const data = await fs.readFile(filePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

/**
 * Genera un nombre de archivo único para la liquidación
 * @param {string} rut - RUT del empleado
 * @param {string} periodo - Período de la liquidación
 * @returns {string}
 */
function generateFileName(rut, periodo) {
  const cleanRut = rut.replace(/\D/g, '');
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return `liquidacion-${cleanRut}-${timestamp}-${randomId}.pdf`;
}

module.exports = {
  isValidRUT,
  formatRUT,
  formatCLPCurrency,
  validateLiquidacionData,
  calculateTotals,
  imageToBase64,
  generateFileName,
};
