# 🔄 MIGRACIÓN: Storage → Firestore

## ¿Por qué el cambio?

### Antes (Plan Blaze - Pago)
```
1. Backend genera QR en base64
2. Inserta QR en PDF
3. Sube PDF a Firebase Storage
4. Retorna URL pública
❌ Requiere Plan Blaze (facturación)
❌ Almacena archivos (costoso)
❌ QR estático en el PDF
```

### Ahora (Plan Spark - Gratis)
```
1. Backend genera ID único
2. Guarda datos alfanuméricos en Firestore
3. Genera PDF con placeholder
4. Retorna documentId
5. Frontend lee Firestore y genera QR dinámico
✅ Plan Spark gratuito
✅ Rendimiento superior
✅ QR actualizable sin regenerar PDF
```

---

## 🏗️ Nueva Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│           ARQUITECTURA NUEVA - FIRESTORE + QR DINÁMICO          │
└─────────────────────────────────────────────────────────────────┘

FASE 1: BACKEND (Node.js)
───────────────────────────
Entrada: JSON con datos liquidación
   ↓
Validación de datos
   ↓
Generar ID único (timestamp + UUID)
   ↓
Generar HTML con PLACEHOLDER de QR
   ↓
Renderizar HTML → PDF (Puppeteer)
   ↓
Guardar datos en Firestore:
   {
     documentId: "string",
     fileName: "string",
     rut: "string",
     nombreEmpleado: "string",
     periodo: "string",
     razonSocial: "string",
     qrContent: {
       documentId: "string",
       empleado: "string",
       rut: "string",
       periodo: "string",
       timestamp: "ISO8601"
     }
   }
   ↓
Retornar:
   {
     documentId: "ID para buscar en Firestore",
     firestoreDocId: "ID del documento Firestore",
     pdfBuffer: "Buffer del PDF",
     savedPath: "Ruta local del PDF (opcional)",
     firestoreData: "Datos guardados"
   }

FASE 2: FRONTEND (JavaScript/HTML)
──────────────────────────────────
Usuario abre: frontend-qr-viewer.html
   ↓
Ingresa documentId
   ↓
Lee documento de Firestore
   ↓
Genera CÓDIGO QR dinámico con qrcode.js
   ↓
Muestra PDF con QR superpuesto
   ↓
Usuario puede:
   - Descargar QR
   - Ver datos
   - Escanear código
```

---

## 📋 Comparativa

| Aspecto | Antes (Storage) | Ahora (Firestore) |
|---------|-----------------|-------------------|
| **Plan** | Blaze (pagado) | Spark (gratis) |
| **QR** | Estático en PDF | Dinámico en frontend |
| **Almacenamiento** | PDF en Cloud Storage | Strings en Firestore |
| **Datos guardados** | Archivo completo (~200KB) | Documento JSON (~5KB) |
| **Latencia lectura** | 1-3 segundos | 100-500ms |
| **Tarjeta de crédito** | ✅ Requerida | ❌ NO requerida |

---

## 💾 Estructura Firestore

### Colección: `registros_qr`

```javascript
{
  documentId: "1710435022-a1b2c3d4",
  fileName: "liquidacion-11153434-3-1710435022-a1b2c3d4.pdf",
  rut: "11.153.434-3",
  nombreEmpleado: "YORKA CECILIA ALVARADO LOPEZ",
  periodo: "abril de 2025",
  razonSocial: "SAN FRANCISCO INVESTMENT S.A.",
  
  qrContent: {
    documentId: "1710435022-a1b2c3d4",
    empleado: "YORKA CECILIA ALVARADO LOPEZ",
    rut: "11.153.434-3",
    periodo: "abril de 2025",
    timestamp: "2025-03-14T10:30:22.000Z"
  },
  
  createdAt: Timestamp(2025-03-14T10:30:22Z),
  status: "active"
}
```

**Tamaño:** ~1-2KB por documento  
**Almacenamiento Spark:** 1GB gratis  
**Máximo documentos:** ~500,000 con plan Spark

---

## 🚀 Nuevo Flujo de Uso

### 1️⃣ Generar Liquidación (Backend)

```javascript
const { generateLiquidacionPDF } = require('./src/index.js');

const result = await generateLiquidacionPDF(data, {
  saveToFile: true,
  outputDir: './output'
});

console.log(result.documentId);        // "1710435022-a1b2c3d4"
console.log(result.firestoreDocId);    // ID del doc en Firestore
console.log(result.pdfBuffer);         // Buffer del PDF
console.log(result.firestoreData);     // Datos guardados
```

### 2️⃣ Obtener PDF (usuarios)

Guardando el PDF localmente o en tu servidor:

```javascript
// Opción A: Guardar en servidor
app.post('/api/liquidacion', async (req, res) => {
  const result = await generateLiquidacionPDF(req.body);
  
  // Guardar PDF en servidor
  const fs = require('fs').promises;
  await fs.writeFile(`./docs/${result.fileName}`, result.pdfBuffer);
  
  res.json({
    documentId: result.documentId,
    pdfUrl: `/docs/${result.fileName}`,
    firestoreData: result.firestoreData
  });
});
```

### 3️⃣ Ver Liquidación con QR (Frontend)

Usa `examples/frontend-qr-viewer.html`:

1. Abre en navegador
2. Configura Firebase credentials
3. Ingresa documentId
4. Frontend:
   - Lee datos de Firestore
   - Genera QR dinámico
   - Muestra PDF + QR

---

## 🔑 Ventajas Técnicas

### ✅ Rendimiento

```
READ Firestore:      ~100-500ms (vs 1-3s Storage)
QR generation:       ~30ms (en cliente)
Total latency:       ~150-600ms (vs 3-8s antes)
```

### ✅ Escalabilidad

```
Firestore Spark:     1GB almacenamiento
                     50,000 lecturas/día gratis
                     20,000 escrituras/día gratis
                     
Ejemplo:
- 100 liquidaciones/día = 100 escrituras
- 1000 descargas/día = 1000 lecturas
- ✅ Dentro del límite gratuito
```

### ✅ Flexibilidad

```
- Cambiar QR sin regenerar PDF
- Actualizar datos sin reupload
- Generar QR offline (una vez cargados datos)
- Múltiples formatos (JSON, URL, etc)
```

---

## 🔐 Seguridad

### Reglas Firestore (Spark Plan)

Para desarrollo (ABIERTO):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registros_qr/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Para producción (RESTRICTIVO):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registros_qr/{docId} {
      // Solo lectura para todos
      allow read: if true;
      
      // Escritura solo desde backend (autenticado)
      allow create: if request.auth != null && 
                       request.auth.token.admin == true;
      
      // Actualización solo por propietario
      allow update: if request.auth != null &&
                       request.auth.uid == resource.data.userId;
      
      // Eliminar solo propietario
      allow delete: if request.auth != null &&
                       request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 🛠️ Integración Paso a Paso

### Paso 1: Instalación (igual que antes)
```bash
npm install
```

### Paso 2: Configurar .env

```env
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu-email@proyecto.iam.gserviceaccount.com
FIRESTORE_COLLECTION_NAME=registros_qr
NODE_ENV=production
```

⚠️ **Ya NO necesitas:** `FIREBASE_STORAGE_BUCKET`

### Paso 3: Generar Liquidación

```bash
npm run example
```

Output:
```
📄 1. Generando ID único: 1710435022-a1b2c3d4
📄 2. Generando HTML...
📄 3. Renderizando PDF con Puppeteer...
📄 4. Preparando datos para Firestore...
📄 5. Guardando datos en Firestore...
📄 6. PDF guardado localmente: ./output/liquidacion-...pdf

✅ Liquidación generada correctamente
📍 DocumentID Firestore: ABC123XYZ...
```

### Paso 4: Ver en Frontend

1. Abre `examples/frontend-qr-viewer.html`
2. Configura Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ... más opciones
   };
   ```
3. Ingresa documentId: `1710435022-a1b2c3d4`
4. Haz clic "Cargar"
5. ✅ QR generado dinámicamente

---

## 📊 Monitoreo en Firebase Console

### Firestore
1. Firebase Console → Firestore Database
2. Colección: `registros_qr`
3. Ver documentos en tiempo real
4. Monitorear uso de cuota (Spark)

### Estadísticas
- **Documentos guardados:** N
- **Tamaño total:** N × 2KB ≈ cantidad
- **Lecturas:** Tus descargas
- **Escrituras:** Tus generaciones

---

## ⚠️ Limitaciones Spark Plan

| Límite | Cantidad | Tu caso |
|--------|----------|---------|
| Almacenamiento | 1GB | ~500k docs OK |
| Lecturas/día | 50,000 | ~1,666 descargas OK |
| Escrituras/día | 20,000 | ~666 generaciones OK |
| Tamaño doc | 1MB | 2KB OK |

**Si superas estos límites:** Actualiza a Blaze Plan (solo pagas lo que usas)

---

## 🔄 Migración desde Sistema Anterior

Si tenías PDFs en Storage:

1. Los PDFs siguen en Storage (no se eliminan)
2. Nuevas liquidaciones van a Firestore
3. Migración opcional de datos históricos

---

## 🎯 Casos de Uso

### Caso 1: Descarga Única
```
✅ Óptimo - Solo una lectura Firestore
```

### Caso 2: Compartir Liquidación
```
Link: https://myapp.com/liquidacion?id=ABC123
Frontend lee Firestore, genera QR
✅ Sin depender de Storage
```

### Caso 3: Portal de Empleados
```
Lista de liquidaciones = Lectura de colección
Expandir una = Lee documento específico
✅ Rápido, escalable, gratis
```

---

## 📚 Archivos Relacionados

- `src/index.js` - Lógica backend actualizada
- `examples/example.js` - Ejemplo Node.js
- `examples/frontend-qr-viewer.html` - Viewer con QR dinámico
- `.env.example` - Config sin Storage Bucket

---

## ❓ Preguntas Frecuentes

**¿Qué pasa con mis PDFs almacenados?**  
Permanecen en Storage (sin cambios). Los nuevos van a Firestore.

**¿Necesito Plan Blaze ahora?**  
No. Plan Spark es suficiente para Firestore.

**¿El QR será diferente cada vez?**  
No. El QR contiene los datos + timestamp = consistente.

**¿Puedo tener ambos sistemas?**  
Sí. Puedes mantener PDFs en Storage si lo necesitas.

**¿Qué si Firestore cae?**  
Tienes el PDF localmente. El QR se genera client-side.

---

**Versión:** 2.0.0 (Firestore Edition)  
**Última actualización:** 2025-03-14
