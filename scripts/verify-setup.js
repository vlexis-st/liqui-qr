/**
 * Script de Verificación - Valida que todo está correctamente configurado
 * Uso: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Validaciones simples (sin dependencias externas si es posible)
const checks = [];

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('es-CL');
  const prefix = `[${timestamp}]`;

  switch (type) {
    case 'success':
      console.log(`${prefix} ✅ ${message}`);
      break;
    case 'error':
      console.log(`${prefix} ❌ ${message}`);
      break;
    case 'warning':
      console.log(`${prefix} ⚠️  ${message}`);
      break;
    case 'info':
      console.log(`${prefix} ℹ️  ${message}`);
      break;
    case 'header':
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  ${message}`);
      console.log('═'.repeat(60) + '\n');
      break;
  }
}

// ============= VERIFICACIONES =============

log('INICIANDO VERIFICACIÓN DE SETUP', 'header');

// 1. Verificar Node.js
log('Verificando Node.js...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion >= 16) {
    log(`Node.js ${nodeVersion} detectado`, 'success');
    checks.push({ name: 'Node.js', status: 'pass' });
  } else {
    log(`Node.js ${nodeVersion} - se requiere v16 o superior`, 'error');
    checks.push({ name: 'Node.js', status: 'fail' });
  }
} catch (error) {
  log('Error verificando Node.js', 'error');
  checks.push({ name: 'Node.js', status: 'fail' });
}

// 2. Verificar package.json
log('Verificando package.json...');
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );
  if (packageJson.name) {
    log(`Proyecto: ${packageJson.name} v${packageJson.version}`, 'success');
    checks.push({ name: 'package.json', status: 'pass' });
  }
} catch (error) {
  log('package.json no encontrado o inválido', 'error');
  checks.push({ name: 'package.json', status: 'fail' });
}

// 3. Verificar node_modules
log('Verificando dependencias instaladas...');
const requiredModules = ['puppeteer', 'qrcode', 'firebase-admin', 'dotenv', 'uuid'];
let allModulesInstalled = true;

requiredModules.forEach((module) => {
  try {
    require.resolve(module);
    log(`  ${module} ✓`, 'info');
  } catch {
    log(`  ${module} ✗ (no instalado)`, 'warning');
    allModulesInstalled = false;
  }
});

if (allModulesInstalled) {
  log('Todas las dependencias están instaladas', 'success');
  checks.push({ name: 'Dependencias', status: 'pass' });
} else {
  log('Ejecuta: npm install', 'warning');
  checks.push({ name: 'Dependencias', status: 'warn' });
}

// 4. Verificar estructura de carpetas
log('Verificando estructura de carpetas...');
const requiredDirs = ['src', 'examples'];
let dirStructureOk = true;

requiredDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    log(`  ${dir}/ ✓`, 'info');
  } else {
    log(`  ${dir}/ ✗ (no encontrado)`, 'warning');
    dirStructureOk = false;
  }
});

if (dirStructureOk) {
  checks.push({ name: 'Estructura', status: 'pass' });
} else {
  checks.push({ name: 'Estructura', status: 'warn' });
}

// 5. Verificar archivos principales
log('Verificando archivos principales...');
const requiredFiles = [
  'src/index.js',
  'src/utils.js',
  'examples/example.js',
  'README.md',
];
let filesOk = true;

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    log(`  ${file} (${stats.size} bytes) ✓`, 'info');
  } else {
    log(`  ${file} ✗ (no encontrado)`, 'warning');
    filesOk = false;
  }
});

if (filesOk) {
  checks.push({ name: 'Archivos', status: 'pass' });
} else {
  checks.push({ name: 'Archivos', status: 'warn' });
}

// 6. Verificar configuración Firebase (.env)
log('Verificando configuración Firebase...');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_STORAGE_BUCKET',
  ];

  let envOk = true;
  requiredEnvVars.forEach((varName) => {
    if (envContent.includes(varName)) {
      const value = envContent.split(`${varName}=`)[1]?.split('\n')[0];
      if (value && value !== 'your-' + varName.toLowerCase()) {
        log(`  ${varName} ✓ (configurado)`, 'info');
      } else {
        log(`  ${varName} ✗ (valor placeholder)`, 'warning');
        envOk = false;
      }
    } else {
      log(`  ${varName} ✗ (no encontrado)`, 'warning');
      envOk = false;
    }
  });

  if (envOk) {
    checks.push({ name: 'Firebase Config', status: 'pass' });
    log('Configuración Firebase lista', 'success');
  } else {
    log('Algunos valores no están configurados', 'warning');
    checks.push({ name: 'Firebase Config', status: 'warn' });
  }
} else {
  log('.env no encontrado. Copia .env.example a .env', 'warning');
  checks.push({ name: 'Firebase Config', status: 'warn' });
}

// 7. Resumen final
log('RESUMEN', 'header');

const summary = {
  total: checks.length,
  pass: checks.filter((c) => c.status === 'pass').length,
  warn: checks.filter((c) => c.status === 'warn').length,
  fail: checks.filter((c) => c.status === 'fail').length,
};

console.log('Verificaciones realizadas:');
checks.forEach((check) => {
  const icon =
    check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️ ' : '❌';
  console.log(`  ${icon} ${check.name}`);
});

console.log(`\nTotal: ${summary.total} | Exitosas: ${summary.pass} | Advertencias: ${summary.warn} | Errores: ${summary.fail}`);

if (summary.fail === 0 && summary.warn === 0) {
  log('¡Sistema listo! Puedes ejecutar npm run example', 'success');
  process.exit(0);
} else if (summary.fail === 0) {
  log('Sistema funcional pero con advertencias. Revisa arriba.', 'warning');
  process.exit(0);
} else {
  log('Sistema con errores críticos. Revisa arriba.', 'error');
  process.exit(1);
}
