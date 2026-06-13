import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';

dotenv.config({ path: '../.env' });

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const PAYPAL_BUSINESS = process.env.PAYPAL_BUSINESS || 'TU_CORREO_PAYPAL_PERSONAL@gmail.com';
const EMAIL_TO = process.env.EMAIL_TO || process.env.EMAIL_USER || 'admin@example.com';

// Configuración de la conexión a PostgreSQL (Esquema por defecto: public)
const pool = new Pool({
  host: 'ep-bold-sound-abn7lrav.eu-west-2.aws.neon.tech',
  database: 'iptv',
  user: 'neondb_owner',
  password: 'npg_zkCft3mY6qEA',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Requerido para conectar con Neon de forma segura
  }
});

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
  total: number;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
}

let visitCount = 0;

function computeTotal(duration: number): number {
  return duration === 1 ? 0.01 : duration === 3 ? 25 : 40;
}

async function sendCustomerEmail(order: Order): Promise<void> {
  if (!emailTransportConfig.auth.user || !emailTransportConfig.auth.pass) {
    console.warn('Email al cliente no enviado porque faltan credenciales SMTP.');
    return;
  }

  const transporter = nodemailer.createTransport(emailTransportConfig);

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
  const { email, duration } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  if (![1, 3, 6].includes(duration)) {
    return res.status(400).json({ error: 'Duración inválida.' });
  }

  const total = computeTotal(duration);
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const insertOrderQuery = `
      INSERT INTO orders (id, email, duration, total, created_at, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(insertOrderQuery, [id, email, duration, total, createdAt, 'pending']);
  } catch (error) {
    console.error('Error insertando la orden en base de datos:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar la orden.' });
  }

  const baseUrl = `http://localhost:4200`;
  const returnUrl = process.env.SUCCESS_URL || `${baseUrl}/success`;
  const cancelUrl = process.env.CANCEL_URL || `${baseUrl}/`;
  const itemName = `IPTV ${duration} mes${duration === 1 ? '' : 'es'}`;
  
  const redirectUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_BUSINESS)}&item_name=${encodeURIComponent(itemName)}&amount=0.01&currency_code=EUR&return=${encodeURIComponent(returnUrl)}&cancel_return=${encodeURIComponent(cancelUrl)}&no_shipping=1&rm=1`;

  res.json({ 
    success: true, 
    redirectUrl 
  });
});

// 2. EL FRONTEND CONFIRMA LA ORDEN AL VOLVER DE PAYPAY
app.post('/back/orders/confirm', async (req: Request, res: Response) => {
  try {
    // Buscamos la última orden pendiente en la tabla orders
    const selectPendingOrderQuery = `
      SELECT id, email, duration, total, created_at, status 
      FROM orders 
      WHERE status = 'pending' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const orderResult = await pool.query(selectPendingOrderQuery);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró ninguna orden pendiente.' });
    }

    const dbOrder = orderResult.rows[0];

    // Cambiamos el estado a 'completed'
    const updateOrderQuery = `
      UPDATE orders 
      SET status = 'completed' 
      WHERE id = $1
    `;
    await pool.query(updateOrderQuery, [dbOrder.id]);

    const completedOrder: Order = {
      id: dbOrder.id,
      email: dbOrder.email,
      duration: dbOrder.duration,
      total: Number(dbOrder.total),
      createdAt: dbOrder.created_at,
      status: 'completed'
    };

    // Envío seguro del email únicamente al comprador una vez persistido el estado en BBDD
    await sendCustomerEmail(completedOrder);
    
    return res.json({ 
      success: true, 
      message: 'Pago confirmado. Credenciales de la orden enviadas por correo electrónico.' 
    });
  } catch (err) {
    console.error('Error durante la transacción de confirmación de la orden:', err);
    return res.status(500).json({ error: 'Error en el servidor al procesar los correos post-pago.' });
  }
});

app.get('/back/visit', (req: Request, res: Response) => {
  visitCount += 1;
  res.json({ count: visitCount });
});

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', version: '1.2' });
});

app.get('/back/admin', async (req: Request, res: Response) => {
  try {
    const adminOrdersQuery = `
      SELECT id, email, duration, total, created_at, status
      FROM orders
      ORDER BY created_at DESC
    `;
    const result = await pool.query(adminOrdersQuery);
    res.json({ visits: visitCount, orders: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al recuperar registros de administración.' });
  }
});

app.get('/back/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`Backend IPTV sin categorías escuchando en http://localhost:${PORT}`);
});

export default server;