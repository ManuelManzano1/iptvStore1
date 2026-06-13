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
  const base = duration === 1 ? 15 : duration === 3 ? 40 : 75;
  const extra = (categories?.length || 0) * 3;
  return base + extra;
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

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos una categoría.' });
  }

  const total = computeTotal(duration, categories);
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const order: Order = {
    id,
    email,
    duration,
    categories,
    total,
    createdAt,
    status: 'pending'
  };

  orders.unshift(order);

  try {
    await sendEmail(order);
  } catch (err) {
    console.error('Error al enviar email:', err);
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `${protocol}://${host}`;
  const returnUrl = process.env.SUCCESS_URL || `${baseUrl}/success?orderId=${id}`;
  const cancelUrl = process.env.CANCEL_URL || `${baseUrl}/`;

  const itemName = `IPTV ${duration} meses + ${categories.join(', ')}`;
  const redirectUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_BUSINESS)}&item_name=${encodeURIComponent(itemName)}&amount=${total.toFixed(2)}&currency_code=EUR&return=${encodeURIComponent(returnUrl)}&cancel_return=${encodeURIComponent(cancelUrl)}&no_shipping=1&rm=2`;

  res.json({ redirectUrl });
});

app.get('/back/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`Backend IPTV escuchando en http://localhost:${PORT}`);
});

export default server;
