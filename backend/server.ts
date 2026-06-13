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
const PAYPAL_BUSINESS = process.env.PAYPAL_BUSINESS || 'YOUR_PAYPAL_EMAIL@example.com';
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

const orders: Order[] = [];
let visitCount = 0;

function computeTotal(duration: number, categories: string[]): number {
  // Nuevos precios con descuento: 1 mes: 10€, 3 meses: 25€, 6 meses: 40€
  return duration === 1 ? 10 : duration === 3 ? 25 : 40;
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
    subject: `Nueva orden IPTV - ${order.duration} mes${order.duration === 1 ? '' : 'es'}`,
    text: `Nueva orden IPTV\nEmail: ${order.email}\nDuración: ${order.duration} meses\nCategorías: ${order.categories.join(', ')}\nTotal: ${order.total.toFixed(2)} €\nID: ${order.id}`,
    html: `
      <h2>Nueva orden IPTV</h2>
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
    subject: `¡Aquí tienes los datos de tu suscripción IPTV!`,
    text: `¡Hola!\n\nGracias por comprar. Aquí tienes las instrucciones para disfrutar de tu IPTV.\n\nPaso 1: Descargar app MaxPlayer\nPaso 2: Introducir los siguientes datos de login\n  Usuario: IPTVSPAIN1\n  Contraseña: xxxcccxxxccc\n\nDatos de tu suscripción:\nID de orden: ${order.id}\nDuración: ${order.duration} mes${order.duration === 1 ? '' : 'es'}\nCategorías: ${order.categories.join(', ')}\nTotal: ${order.total.toFixed(2)} €\n\nSaludos,\nEl equipo de IPTV Store`,
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
          .step-number { display: inline-block; background-color: #667eea; color: white; width: 35px; height: 35px; line-height: 35px; text-align: center; border-radius: 50%; font-weight: bold; margin-right: 10px; font-size: 16px; }
          .step-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px; }
          .step-content { font-size: 14px; color: #555; }
          .credentials { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
          .credential-item { margin: 8px 0; font-size: 14px; }
          .label { font-weight: bold; color: #667eea; }
          .data-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
          .data-table th { background-color: #f0f4ff; color: #667eea; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #667eea; }
          .data-table td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
          .data-table tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { background-color: #667eea; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; margin: -20px -20px -20px -20px; font-size: 12px; }
          .cta-button { display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a IPTV Store!</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; color: #333;">¡Hola!</p>
            <p style="font-size: 16px; color: #333;">Gracias por comprar. Aquí tienes las instrucciones para disfrutar de tu IPTV.</p>
            
            <div class="section-title">📱 Pasos a seguir:</div>
            
            <div class="step">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span class="step-number">1</span>
                <span class="step-title">Descargar app MaxPlayer</span>
              </div>
              <div class="step-content">Descarga la aplicación MaxPlayer en tu dispositivo (disponible en App Store y Google Play)</div>
            </div>
            
            <div class="step">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span class="step-number">2</span>
                <span class="step-title">Introducir datos de login</span>
              </div>
              <div class="step-content">Una vez dentro de la app, introduce los siguientes datos:</div>
              <div class="credentials">
                <div class="credential-item"><span class="label">Usuario:</span> IPTVSPAIN1</div>
                <div class="credential-item"><span class="label">Contraseña:</span> xxxcccxxxccc</div>
              </div>
            </div>
            
            <div class="section-title">📋 Datos de tu suscripción:</div>
            <table class="data-table">
              <tr>
                <th>Concepto</th>
                <th>Detalle</th>
              </tr>
              <tr>
                <td><strong>ID de orden</strong></td>
                <td>${order.id}</td>
              </tr>
              <tr>
                <td><strong>Duración</strong></td>
                <td>${order.duration} mes${order.duration === 1 ? '' : 'es'}</td>
              </tr>
              <tr>
                <td><strong>Categorías</strong></td>
                <td><ul style="margin: 0; padding-left: 20px;">${htmlCategories}</ul></td>
              </tr>
              <tr>
                <td><strong>Total pagado</strong></td>
                <td style="color: #667eea; font-weight: bold; font-size: 16px;">${order.total.toFixed(2)} €</td>
              </tr>
              <tr>
                <td><strong>Fecha de compra</strong></td>
                <td>${new Date(order.createdAt).toLocaleDateString('es-ES')}</td>
              </tr>
            </table>
            
            <p style="text-align: center; font-size: 14px; color: #666; margin-top: 30px;">
              ¿Necesitas ayuda? Contacta con nuestro equipo de soporte
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">¡A disfrutar de tu IPTV!</p>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">© 2026 IPTV Store - Todos los derechos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(message) as unknown as Promise<void>;
}

app.get('/back/visit', (req: Request, res: Response) => {
  visitCount += 1;
  res.json({ count: visitCount });
});

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend IPTV API available at /back/*', version: '1.0' });
});

app.get('/back/admin', (req: Request, res: Response) => {
  res.json({ visits: visitCount, orders });
});

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

  try {
    await sendEmail(order);
    await sendCustomerEmail(order);
  } catch (err) {
    console.error('Error al enviar email:', err);
  }

  // TODO: Descomentar para PayPal en producción
  // const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  // const host = req.headers['x-forwarded-host'] || req.get('host');
  // const baseUrl = `${protocol}://${host}`;
  // const returnUrl = process.env.SUCCESS_URL || `${baseUrl}/success?orderId=${id}`;
  // const cancelUrl = process.env.CANCEL_URL || `${baseUrl}/`;
  //
  // const itemName = `IPTV ${duration} meses + ${categories.join(', ')}`;
  // const redirectUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_BUSINESS)}&item_name=${encodeURIComponent(itemName)}&amount=${total.toFixed(2)}&currency_code=EUR&return=${encodeURIComponent(returnUrl)}&cancel_return=${encodeURIComponent(cancelUrl)}&no_shipping=1&rm=2`;
  //
  // res.json({ redirectUrl });

  res.json({ success: true, message: 'Orden creada. Email enviado.', orderId: id });
});

app.get('/back/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`Backend IPTV escuchando en http://localhost:${PORT}`);
});

export default server;
