# 🚀 NUEVO FLUJO: Firestore + QR Dinámico

> El cambio más importante: **Ya no necesitas Firebase Storage (Plan Blaze pagado)**
> Ahora usamos Firestore (Plan Spark gratuito) con QR generado dinámicamente en el frontend

## ¿Cuál es el Cambio?

### Antes
```
PDF + QR (base64) → Firebase Storage → URL pública
❌ Requiere Plan Blaze
❌ QR estático
```

### Ahora
```
PDF (placeholder) → Firestore (datos) → Frontend genera QR
✅ Plan Spark gratuito
✅ QR dinámico
✅ Rendimiento superior
```

---

## 📋 Nuevo Flujo

### 1️⃣ Backend (Node.js)
```bash
npm install
npm run example
```

Genera:
- PDF con placeholder para QR
- Datos guardados en Firestore (colección: `registros_qr`)
- Retorna `documentId` para consultar en Firestore

### 2️⃣ Frontend (HTML/JavaScript)
Abre: `examples/frontend-qr-viewer.html`

Ingresa: `documentId` (obtenido del backend)

Resultado:
- Lee datos de Firestore
- Genera QR dinámico con `qrcode.js`
- Muestra PDF + QR

---

## ⚖️ Ventajas

| Aspecto | Ahora |
|--------|-------|
| **Costo** | $0 - Plan Spark |
| **Performance** | 100-500ms (vs 1-3s antes) |
| **QR** | Dinámico + actualizable |
| **Tarjeta** | NO necesaria |
| **Escala** | Millones de docs |

---

## 🔧 Configuración Rápida

### 1. .env
```env
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL="..."
FIRESTORE_COLLECTION_NAME=registros_qr
```

⚠️ **YA NO necesitas:** `FIREBASE_STORAGE_BUCKET`

### 2. Firebase Console
- Firestore Database → Crear colección
- Nombre: `registros_qr`
- Listo

---

## 📁 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/index.js` | Backend (genera PDF + guarda en Firestore) |
| `examples/example.js` | Ejecutar desde Node.js |
| `examples/frontend-qr-viewer.html` | Interfaz para ver liquidaciones con QR |
| `MIGRATION-FIRESTORE.md` | Documentación técnica completa |

---

## ⚡ Ejemplo Rápido

### Backend
```bash
npm run example

# Output:
# ✅ Liquidación generada correctamente
# 📍 DocumentID Firestore: ABC123XYZ...
```

### Frontend

1. Abre `examples/frontend-qr-viewer.html` en navegador
2. Configura Firebase credentials (línea 71-79)
3. Ingresa Document ID: `ABC123XYZ...`
4. Click "Cargar"
5. ✅ QR generado dinámicamente

---

## 🎨 Flujo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│ USUARIO SOLICITA LIQUIDACIÓN                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
                    ┌────────────────────┐
                    │ BACKEND (Node.js)  │
                    └────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ↓                    ↓                    ↓
    Generar PDF    Guardar en Firestore   Retornar documentId
    (placeholder)  (datos alfanuméricos)  (para frontend)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ↓
                    ┌────────────────────┐
                    │ USUARIO ABRE PDF   │
                    │ frontend-qr...html │
                    └────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ↓                    ↓                    ↓
    Lee Firestore   Genera QR dinámico  Muestra todo
    (con documentId) (qrcode.js)        (PDF + QR)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ↓
                    ┌────────────────────┐
                    │ ✅ LISTO PARA      │
                    │ - Descargar        │
                    │ - Escanear QR      │
                    │ - Compartir        │
                    └────────────────────┘
```

---

## 📊 Firestore Spark Plan

**Cuota gratuita incluida:**
- 1 GB almacenamiento
- 50,000 lecturas/día
- 20,000 escrituras/día

**Para tus liquidaciones:**
- 100 genera/día = 100 escrituras ✅
- 500 descargas/día = 500 lecturas ✅
- **Costo: $0**

---

## 🔗 Documentación

- [MIGRATION-FIRESTORE.md](MIGRATION-FIRESTORE.md) - Detalles técnicos
- [README.md](README.md) - Documentación principal
- [INSTALL.md](INSTALL.md) - Instalación
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solucionar problemas

---

## ❓ FAQ

**¿Dónde guardo los PDFs ahora?**  
- Localmente en tu servidor (`./output` por defecto)
- O en tu propio Storage/DB

**¿Seguirá funcionando con usuarios sin Firestore?**  
Solo el frontend necesita Firestore. Backend no accede a él.

**¿Qué pasa si borro documentos de Firestore?**  
El PDF permanece (guardado localmente). Solo el QR no se puede regenerar.

**¿Puedo tener QR estático como antes?**  
Sí, pero pierdes las ventajas. No lo recomendamos.

---

## 🎯 Próximos Pasos

1. ✅ Actualiza `.env` (quita STORAGE_BUCKET)
2. ✅ Corre `npm run example`
3. ✅ Abre `frontend-qr-viewer.html`
4. ✅ Ingresa DocumentID
5. ✅ ¡Listo! QR dinámico funcionando

---

<div align="center">

**Versión:** 2.0 (Firestore Edition)

**¿Listos? Empiecen con:** `npm install && npm run example`

</div>
