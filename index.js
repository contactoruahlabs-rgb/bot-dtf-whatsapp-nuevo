const crypto = require('crypto');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

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

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('\n\n📱 ESCANEA ESTE CÓDIGO QR CON WHATSAPP:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n\n');
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

startBot();
