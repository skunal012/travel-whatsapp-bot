import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { EnvSchema, type HealthResponse } from './types/index.js';

// Load environment variables
dotenv.config();

// Validate environment configuration
const envResult = EnvSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Configuration Error:');
  envResult.error.errors.forEach((err) => {
    console.error(`  - ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

const config = envResult.data;

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next) => {
  console.log(JSON.stringify({
    level: 'info',
    message: 'Incoming request',
    timestamp: new Date().toISOString(),
    context: {
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
  }));
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    services: {
      database: 'connected', // TODO: Implement actual DB check
      aiProvider: config.AI_PROVIDER === 'groq' ? 'connected' : 'connected', // TODO: Implement actual AI check
    },
  };
  res.json(response);
});

// Webhook endpoint placeholder
app.post('/webhook/whatsapp', (req: Request, res: Response) => {
  console.log(JSON.stringify({
    level: 'debug',
    message: 'Webhook received',
    timestamp: new Date().toISOString(),
    context: { body: req.body },
  }));
  res.status(200).json({ status: 'ok' });
});

// Webhook verification endpoint (360dialog requires this)
app.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify token matches
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log(JSON.stringify({
      level: 'info',
      message: 'Webhook verified',
      timestamp: new Date().toISOString(),
    }));
    res.status(200).send(challenge);
  } else {
    console.log(JSON.stringify({
      level: 'warn',
      message: 'Webhook verification failed',
      timestamp: new Date().toISOString(),
      context: { mode, tokenMatches: token === process.env.WEBHOOK_VERIFY_TOKEN },
    }));
    res.status(403).send('Forbidden');
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({
    level: 'error',
    message: 'Unhandled error',
    timestamp: new Date().toISOString(),
    context: {
      error: err.message,
      stack: err.stack,
    },
  }));
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `Travel WhatsApp Bot started`,
    timestamp: new Date().toISOString(),
    context: {
      port: PORT,
      nodeEnv: config.NODE_ENV,
      aiProvider: config.AI_PROVIDER,
      agencyName: config.AGENCY_NAME,
    },
  }));
});

export default app;