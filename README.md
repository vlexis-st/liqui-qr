# 📄 Talana Liquidación PDF Generator

Generador pixel-perfect de PDFs de liquidaciones de Talana (Chile) con código QR dinámico e integración automática con Firebase Storage.

## 🎯 Características

✅ **Pixel-Perfect Design**: Fidelidad del 100% respecto al documento original de Talana
✅ **QR Dinámico**: El código QR apunta automáticamente a la URL pública del PDF
✅ **Responsive Layout**: Estructura perfecta con dos columnas (Empleado/Empresa)
✅ **Firebase Integration**: Carga automática a Storage y generación de URL pública
✅ **Puppeteer Rendering**: Renderiza HTML de alta calidad a PDF
✅ **Soporte Completo**: Haberes, descuentos legales y otros descuentos
✅ **Colores Exactos**: Sigue la paleta original (#d9e9f6, #b4d5f0, #333333)

## ⚙️ Requisitos Previos

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Cuenta Firebase** con proyecto creado
- **Credenciales Firebase Admin SDK** descargadas

## 📦 Instalación

### 1. Clonar o descargar el proyecto

```bash
cd "Liqui QR"
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` e ingresa tus credenciales de Firebase:

```env
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu-email@tuproyecto.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=tuproyecto.appspot.com
NODE_ENV=production
```

### 4. Obtener credenciales Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Gear Icon (⚙️) → Project Settings
4. Tab "Service Accounts"
5. Click "Generate New Private Key"
6. Copia los valores correspondientes a tu `.env`

## 🚀 Uso Básico

### Opción 1: Usar el ejemplo incluido

```bash
npm run example
```

### Opción 2: Usar en tu código

```javascript
const { generateLiquidacionPDF } = require('./src/index.js');

const data = {
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

async function main() {
  const result = await generateLiquidacionPDF(data);
  console.log('PDF generado:', result.url);
}

main();
```

## 📋 Estructura de Datos

### Objeto Principal

```javascript
{
  // Período de la liquidación (formato: "mes de año")
  periodo: "abril de 2025",

  // Información del empleado
  empleado: {
    nombre: string,
    rut: string,          // Formato: XX.XXX.XXX-X
    fechaIngreso: string, // Formato: DD de Mes de YYYY
    cargo: string,
    centroCosto: string,
    codigo: string,
  },

  // Información de la empresa
  empresa: {
    razonSocial: string,
    rut: string,          // Formato: XX.XXX.XXX-X
    sucursal: string,
  },

  // Estadísticas
  diasTrabajados: number,
  diasLicencia: number,
  diasAusencia: number,
  horasBase: number,

  // Haberes (diccionario concepto -> monto)
  haberes: {
    [concepto: string]: number,
  },

  // Descuentos legales
  descuentos: {
    [concepto: string]: number,
  },

  // Otros descuentos
  otros: {
    [concepto: string]: number,
  },
}
```

## 🔄 Flujo de Generación

```
1. Generar ID único (timestamp + UUID)
   ↓
2. Construir URL final: https://storage.googleapis.com/.../liquidacion-XXX.pdf
   ↓
3. Generar código QR con esa URL (como Data URL base64)
   ↓
4. Generar HTML con el QR incrustado
   ↓
5. Renderizar HTML → PDF (Puppeteer)
   ↓
6. Subir PDF a Firebase Storage
   ↓
7. Retornar URL pública del PDF
```

## 🎨 Personalización

### Modificar colores

En `src/index.js`, dentro de la función `generateHTML()`, edita:

```css
/* Azul cabecera */
background-color: #d9e9f6;

/* Azul tablas */
background-color: #b4d5f0;

/* Texto */
color: #333333;
```

### Modificar tipografía

En las reglas CSS de `body`:

```css
font-family: 'Arial', sans-serif; /* Cambiar aquí */
```

### Ajustar márgenes

En `generatePDFBuffer()`:

```javascript
margin: {
  top: 10,    // mm
  right: 10,  // mm
  bottom: 10, // mm
  left: 10,   // mm
}
```

## 🔐 Seguridad

- Las credenciales de Firebase NUNCA deben estar en el código
- Usa `.env` y asegúrate que `.env` está en `.gitignore`
- Los PDFs se suben como públicos, pero con permisos controlados en Firebase
- Implementa autenticación en tu API si lo necesitas

## 🐛 Troubleshooting

### Error: "TimeoutError: Timed out after 30000 ms"

Aumenta el timeout en la función `generatePDFBuffer()`:

```javascript
await page.setContent(html, {
  waitUntil: 'networkidle0',
  timeout: 60000, // Aumentado de 30000
});
```

### Error: "Cannot find module 'puppeteer'"

Reinstala las dependencias:

```bash
npm install --save puppeteer
```

### El PDF se sube pero no aparece en Firebase

1. Verifica permisos de Storage en Firebase Console
2. Asegúrate que `FIREBASE_STORAGE_BUCKET` es correcto
3. Revisa que las credenciales tienen acceso de escritura

### El QR no aparece en el PDF

- Verifica que `qrcodejs` está instalado: `npm install qrcode`
- Comprueba que la URL de Firebase es correcta
- Revisa que Puppeteer renderiza correctamente (aumenta el `timeout`)

### Los números no se alinean exactamente

Usa `font-family: 'Courier New', monospace` para las columnas numéricas. Ya está implementado en las clases `.table-amount`.

## 📱 Ejemplo de Respuesta

```json
{
  "url": "https://storage.googleapis.com/tuproyecto.appspot.com/liquidaciones/liquidacion-11153434-3-1713124800-a1b2c3d4.pdf",
  "fileName": "liquidacion-11153434-3-1713124800-a1b2c3d4.pdf",
  "pdfPath": "liquidaciones/liquidacion-11153434-3-1713124800-a1b2c3d4.pdf",
  "documentId": "1713124800-a1b2c3d4"
}
```

## 🔗 API Completa

### `generateLiquidacionPDF(data)`

Función principal que genera la liquidación completa.

**Parámetros:**
- `data` (Object): Objeto con estructura descrita en "Estructura de Datos"

**Retorna:**
- Promise<Object>: `{ url, fileName, pdfPath, documentId }`

### `generateHTML(data, qrBase64)`

Genera el HTML de la liquidación.

**Parámetros:**
- `data` (Object): Datos de la liquidación
- `qrBase64` (String): QR en formato Data URL

**Retorna:**
- String: HTML completo

### `generateQRCode(url)`

Genera un código QR en base64.

**Parámetros:**
- `url` (String): URL a codificar

**Retorna:**
- Promise<String>: Data URL del QR

### `generatePDFBuffer(html)`

Renderiza HTML a PDF buffer.

**Parámetros:**
- `html` (String): HTML a renderizar

**Retorna:**
- Promise<Buffer>: Buffer del PDF

### `uploadPDFToFirebase(pdfBuffer, fileName)`

Sube un PDF a Firebase Storage.

**Parámetros:**
- `pdfBuffer` (Buffer): Buffer del PDF
- `fileName` (String): Nombre del archivo

**Retorna:**
- Promise<Object>: `{ url, path }`

## 📄 Licencia

MIT

## 👨‍💼 Soporte

Para reportar problemas o sugerencias, abre un issue en el repositorio.

---

**Hecho con 💙 para Talana Chile**
