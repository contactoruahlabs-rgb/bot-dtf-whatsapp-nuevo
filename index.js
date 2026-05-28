const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

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

// Función para calcular cotización
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

// Evento QR
client.on('qr', (qr) => {
  console.log('\n📱 ESCANEA ESTE CÓDIGO QR CON WHATSAPP:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n');
});

// Bot listo
client.on('ready', () => {
  console.log('✅ Bot conectado a WhatsApp correctamente');
});

// Mensajes recibidos
client.on('message', async (msg) => {
  console.log(`📨 ${msg.from}: ${msg.body}`);

  const userMessage = msg.body.trim();
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

      msg.reply(response);
      console.log(`✅ Cotización enviada`);
    } else {
      msg.reply('❌ Prenda o tamaño no encontrado. Intenta: Polera, 20x30, 10');
    }
  } else {
    msg.reply('Hola! Envía: *Prenda, tamaños, cantidad*\nEjemplo: Polera, 20x30 + 15x15, 10');
  }
});

client.initialize();
