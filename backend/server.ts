import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';

dotenv.config({ path: '../.env' });

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const PAYPAL_BUSINESS = process.env.PAYPAL_BUSINESS || 'TU_CORREO_PAYPAL_PERSONAL@gmail.com';
const EMAIL_TO = process.env.EMAIL_TO || process.env.EMAIL_USER || 'admin@example.com';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const emailTransportConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
};

interface Order {
  id: string;
  email: string;
  duration: number;
  categories: string[];
  total: number;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
}

// Nota: En producción, considera usar una base de datos (MongoDB, PostgreSQL, etc.) 
// ya que si el servidor se reinicia, este array en memoria se borrará.
const orders: Order[] = [];
let visitCount = 0;

function computeTotal(duration: number, categories: string[]): number {
  return duration === 1 ? 0.01 : duration === 3 ? 25 : 40;
}

async function sendEmail(order: Order): Promise<void> {
  if (!emailTransportConfig.auth.user || !emailTransportConfig.auth.pass) {
    console.warn('Email no enviado porque faltan credenciales SMTP.');
    return;
  }

  const transporter = nodemailer.createTransport(emailTransportConfig);
  const htmlCategories = order.categories.map((cat) => `<li>${cat}</li>`).join('');

  const message = {
    from: process.env.EMAIL_FROM || emailTransportConfig.auth.user,
    to: EMAIL_TO,
    subject: `✅ ¡Pago Completado! Nueva orden IPTV - ${order.duration} mes${order.duration === 1 ? '' : 'es'}`,
    text: `Nueva orden IPTV PAGADA\nEmail: ${order.email}\nDuración: ${order.duration} meses\nCategorías: ${order.categories.join(', ')}\nTotal: ${order.total.toFixed(2)} €\nID: ${order.id}`,
    html: `
      <h2>🎉 Nueva orden IPTV Pagada con Éxito</h2>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Duración:</strong> ${order.duration} mes${order.duration === 1 ? '' : 'es'}</p>
      <p><strong>Total:</strong> ${order.total.toFixed(2)} €</p>
      <p><strong>ID:</strong> ${order.id}</p>
      <p><strong>Categorías:</strong></p>
      <ul>${htmlCategories}</ul>
      <p><strong>Fecha:</strong> ${order.createdAt}</p>
    `
  };

  return transporter.sendMail(message) as unknown as Promise<void>;
}

async function sendCustomerEmail(order: Order): Promise<void> {
  if (!emailTransportConfig.auth.user || !emailTransportConfig.auth.pass) {
    console.warn('Email al cliente no enviado porque faltan credenciales SMTP.');
    return;
  }

  const transporter = nodemailer.createTransport(emailTransportConfig);
  const htmlCategories = order.categories.map((cat) => `<li style="color: #555;">${cat}</li>`).join('');

  const message = {
    from: process.env.EMAIL_FROM || emailTransportConfig.auth.user,
    to: order.email,
    subject: `🎉 ¡Aquí tienes los datos de tu suscripción IPTV!`,
    text: `¡Hola!\n\nGracias por tu pago. Aquí tienes las instrucciones para disfrutar de tu IPTV.\n\nPaso 1: Descargar app MaxPlayer\nPaso 2: Introducir los siguientes datos de login\n  Usuario: IPTVSPAIN1\n  Contraseña: xxxcccxxxccc\n\nDatos de tu suscripción:\nID de orden: ${order.id}\nDuración: ${order.duration} mes${order.duration === 1 ? '' : 'es'}\nTotal: ${order.total.toFixed(2)} €\n\nSaludos,\nEl equipo de IPTV Store`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background-color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
          .section-title { font-size: 20px; color: #667eea; font-weight: bold; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          .step { background-color: #f0f4ff; padding: 20px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 4px; }
          .credentials { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
          .credential-item { margin: 8px 0; font-size: 14px; }
          .label { font-weight: bold; color: #667eea; }
          .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
          .data-table td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
          .footer { background-color: #667eea; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; margin: -20px -20px -20px -20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a IPTV Store!</h1>
          </div>
          <div class="content">
            <p>¡Hola!</p>
            <p>Confirmamos tu pago correctamente. Aquí tienes las instrucciones para activar tu servicio:</p>
            <div class="section-title">📱 Pasos a seguir:</div>
            <div class="step">
              <strong>1. Descargar app MaxPlayer</strong>
              <div style="font-size: 14px; color: #555;">Disponible en las tiendas de aplicaciones oficiales.</div>
            </div>
            <div class="step">
              <strong>2. Datos de Acceso</strong>
              <div class="credentials">
                <div class="credential-item"><span class="label">Usuario:</span> IPTVSPAIN1</div>
                <div class="credential-item"><span class="label">Contraseña:</span> xxxcccxxxccc</div>
              </div>
            </div>
            <div class="section-title">📋 Resumen de Compra:</div>
            <table class="data-table">
              <tr><td><strong>ID de orden</strong></td><td>${order.id}</td></tr>
              <tr><td><strong>Suscripción</strong></td><td>${order.duration} mes${order.duration === 1 ? '' : 'es'}</td></tr>
              <tr><td><strong>Categorías</strong></td><td><ul style="margin:0; padding-left:20px;">${htmlCategories}</ul></td></tr>
              <tr><td><strong>Total</strong></td><td style="color: #667eea; font-weight: bold;">${order.total.toFixed(2)} €</td></tr>
            </table>
          </div>
          <div class="footer">
            <p>© 2026 IPTV Store - Acceso Garantizado</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(message) as unknown as Promise<void>;
}

// 1. EL USUARIO INICIA LA INTENCIÓN DE COMPRA
app.post('/back/orders', async (req: Request, res: Response) => {
  const { email, duration, categories } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  if (![1, 3, 6].includes(duration)) {
    return res.status(400).json({ error: 'Duración inválida.' });
  }

  const categoriesArray = Array.isArray(categories) ? categories : [];
  const total = computeTotal(duration, categoriesArray);
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  // Guardamos la orden con status 'pending' y NO enviamos correos aún
  const order: Order = {
    id,
    email,
    duration,
    categories: categoriesArray,
    total,
    createdAt,
    status: 'pending'
  };

  orders.unshift(order);

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `localhost:4200`;
  
  // IMPORTANTE: Modificamos la URL de retorno para incluir el ID de la orden
  const returnUrl = process.env.SUCCESS_URL || `${baseUrl}/success`;
  const cancelUrl = process.env.CANCEL_URL || `${baseUrl}/`;

  const itemName = `IPTV ${duration} mes${duration === 1 ? '' : 'es'}`;
  
  const redirectUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_BUSINESS)}&item_name=${encodeURIComponent(itemName)}&amount=0.01&currency_code=EUR&return=${encodeURIComponent(returnUrl)}&cancel_return=${encodeURIComponent(cancelUrl)}&no_shipping=1&rm=1`;

  res.json({ 
    success: true, 
    redirectUrl 
  });
});

// 2. NUEVO ENDPOINT: EL FRONTEND LO LLAMA CUANDO EL USUARIO LLEGA A LA PÁGINA DE ÉXITO
app.post('/back/orders/confirm', async (req: Request, res: Response) => {
  const { orderId } = req.body;

  // Buscamos la orden correspondiente en nuestro almacén temporal
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Orden no encontrada.' });
  }

  // Si ya fue completada, evitamos duplicar los correos
  if (order.status === 'completed') {
    return res.json({ success: true, message: 'La orden ya había sido procesada previamente.' });
  }

  // Cambiamos el estado y ahora SÍ disparamos los correos electrónicos
  order.status = 'completed';

  try {
    await sendEmail(order);         // Email para ti (Administrador)
    await sendCustomerEmail(order); // Email para el cliente con sus accesos
    
    return res.json({ 
      success: true, 
      message: 'Pago confirmado. Credenciales enviadas por correo.' 
    });
  } catch (err) {
    console.error('Error al enviar emails tras el pago:', err);
    return res.status(500).json({ error: 'El pago se procesó pero hubo un fallo al enviar los correos.' });
  }
});

app.get('/back/visit', (req: Request, res: Response) => {
  visitCount += 1;
  res.json({ count: visitCount });
});

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', version: '1.1' });
});

app.get('/back/admin', (req: Request, res: Response) => {
  res.json({ visits: visitCount, orders });
});

app.get('/back/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`Backend IPTV seguro escuchando en http://localhost:${PORT}`);
});

export default server;