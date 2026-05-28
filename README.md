# Bot WhatsApp DTF - Cotizador Automático

Bot de WhatsApp que automatiza cotizaciones de impresión DTF (Direct-to-Film).

## 📋 Características

- ✅ Responde automáticamente con cotizaciones
- ✅ Calcula precio por unidad + total
- ✅ Soporte múltiples tamaños DTF
- ✅ Margen de ganancia automático (15%)
- ✅ Desplegado en Railway (gratis)

## 🚀 Instalación en Railway

### 1. Crear repositorio en GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/bot-dtf-whatsapp-nuevo.git
git push -u origin main
```

### 2. Desplegar en Railway

1. Ve a [railway.app](https://railway.app)
2. Click "Deploy from GitHub"
3. Selecciona tu repositorio
4. Click "Deploy"
5. Espera a que termine
6. **Mira los logs** - aparecerá el código QR en los primeros 10 segundos
7. **Escanea con WhatsApp**

## 📱 Cómo usar

Envía un mensaje con el formato:

```
Prenda, tamaños, cantidad

Ejemplos:
- Polera, 20x30, 10
- Buzo, 20x30 + 15x15, 5
- Gorro, 10x10, 20
```

El bot responderá con:
- Precio por unidad
- Costo de producción
- Total con margen (15%)

## 💰 Prendas disponibles

- Polera: $3.500
- Buzo: $6.000
- Gorro: $4.500
- Bolsa: $3.000
- Chaleco: $7.000
- Short: $4.000

## 📏 Tamaños DTF disponibles

- 8x8: $600
- 10x10: $800
- 15x15: $1.200
- 20x20: $1.800
- 25x25: $2.500
- 30x30: $3.500
- 35x35: $4.500

## ⚙️ Configuración

Edita `index.js` para:
- Cambiar precios de prendas
- Cambiar precios de tamaños
- Cambiar margen de ganancia (línea con `* 1.15`)

## 📚 Stack

- Node.js
- whatsapp-web.js
- qrcode-terminal
- Railway

## 📄 Licencia

MIT
