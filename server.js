import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import messageRoutes from './routes/message-routes.js';
import webhookRoutes from './routes/zoom-webhookHandler.js';
import { validateEnvironmentVariables } from './utils/validation.js';

// Load environment variables
dotenv.config();

// Validate required environment variables on startup
const envValidation = validateEnvironmentVariables();
if (!envValidation.isValid) {
  console.error('❌ Environment validation failed:');
  envValidation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Increase payload limit for webhooks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', messageRoutes);
app.use('/webhooks', webhookRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'zoom-team-chatbot',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Zoom Team Chatbot API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      webhooks: '/webhooks',
      api: '/api'
    }
  });
});

// Error handling middleware
app.use((error, _req, res, _next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Zoom Team Chatbot API listening on port ${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhooks`);
});
