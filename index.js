const crypto = require('crypto');
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');

const app = express();
let qrCodeUrl = null;

// Datos de la calculadora
const garments = [
  { name: 'Polera', price: 3500 },
  { name: 'Buzo', price: 6000 },
  { name: 'Gorro', price: 4500 },
  { name: 'Bolsa', price: 3000 },
  { name: 'Chaleco', price: 7000 },
  { name: 'Short', price: 4000 },
];

const sizes = [
  { w: 8, h: 8, cost: 600 },
  { w: 10, h: 10, cost: 800 },
  { w: 15, h: 15, cost: 1200 },
  { w: 20, h: 20, cost: 1800 },
  { w: 25, h: 25, cost: 2500 },
  { w: 30, h: 30, cost: 3500 },
  { w: 35, h: 35, cost: 4500 },
];

function calculateQuote(garmentName, dtfSizes, quantity) {
  const garment = garments.find(g => g.name.toLowerCase() === garmentName.toLowerCase());
  if (!garment) return null;

  let totalProduction = 0;
  let details = [];

  dtfSizes.forEach(size => {
    const sizeInfo = sizes.find(s => s.w === size.w && s.h === size.h);
    if (sizeInfo) {
      totalProduction += sizeInfo.cost;
      details.push(`${size.w}x${size.h}: $${sizeInfo.cost}`);
    }
  });

  const productionPerUnit = totalProduction / dtfSizes.length;
  const totalWithMargin = (garment.price + productionPerUnit) * quantity * 1.15;
  const pricePerUnit = totalWithMargin / quantity;

  return {
    garment: garment.name,
    details: details.join(' + '),
    productionPerUnit: Math.round(productionPerUnit),
    pricePerUnit: Math.round(pricePerUnit),
    quantity: quantity,
    total: Math.round(totalWithMargin),
  };
}

// Servidor HTTP para mostrar el QR
app.get('/', (req, res) => {
  if (qrCodeUrl) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bot WhatsApp DTF - Escanea el QR</title>
        <style>
          body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; font-family: Arial; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          h1 { color: #333; }
          img { width: 300px; height: 300px; margin: 20px 0; }
          p { color: #666; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 Bot WhatsApp DTF</h1>
          <p>Escanea este código QR con WhatsApp:</p>
          <img src="${qrCodeUrl}" alt="QR Code">
          <p>Una vez escaneado, podrás usar el bot para cotizar DTF</p>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send('<h1>⏳ Generando código QR... Recarga en 5 segundos</h1>');
  }
});

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('📱 Generando código QR...');
        qrCodeUrl = await qrcode.toDataURL(qr);
        console.log('✅ Código QR disponible en: http://localhost:3000');
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log('Reconectando...');
          setTimeout(() => startBot(), 3000);
        }
      } else if (connection === 'open') {
        console.log('✅ Bot conectado a WhatsApp');
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.message) return;

      const userMessage = message.message.conversation || message.message.extendedTextMessage?.text || '';
      const senderID = message.key.remoteJid;

      if (!userMessage.trim()) return;

      console.log(`📨 ${senderID}: ${userMessage}`);

      const match = userMessage.match(/(.+?),\s*(.+?),\s*(\d+)/);

      if (match) {
        const garmentName = match[1].trim();
        const sizesStr = match[2].trim();
        const quantity = parseInt(match[3]);

        const dtfSizes = sizesStr
          .split('+')
          .map((s) => {
            const [w, h] = s.trim().split('x').map(Number);
            return { w, h };
          })
          .filter((s) => s.w && s.h);

        const quote = calculateQuote(garmentName, dtfSizes, quantity);

        if (quote) {
          const response = `✅ *Cotización DTF*\n\n` +
            `*${quote.garment}* (${quote.quantity} unidades)\n` +
            `Tamaños: ${quote.details}\n` +
            `Costo producción/u: $${quote.productionPerUnit}\n\n` +
            `💰 *Precio por unidad: $${quote.pricePerUnit}*\n` +
            `💵 *Total: $${quote.total}*`;

          await sock.sendMessage(senderID, { text: response });
          console.log(`✅ Cotización enviada`);
        } else {
          await sock.sendMessage(senderID, { text: '❌ Prenda o tamaño no encontrado. Intenta: Polera, 20x30, 10' });
        }
      } else {
        await sock.sendMessage(senderID, { text: 'Hola! Envía: *Prenda, tamaños, cantidad*\nEjemplo: Polera, 20x30 + 15x15, 10' });
      }
    });
  } catch (err) {
    console.error('Error:', err);
    setTimeout(() => startBot(), 5000);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
  startBot();
});
