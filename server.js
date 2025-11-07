import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

import oauthRoutes from './routes/oauth-routes.js';



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

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://appssdk.zoom.us",
        "https://source.zoom.us",
        "https://cdn.ngrok.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.ngrok.com"],
      imgSrc:   ["'self'", "data:", "blob:"],
      connectSrc: [
        "'self'", "wss:",
        "https://zoom.us", "https://*.zoom.us",
        "https://*.ngrok.app", "https://*.ngrok.io"
      ],
      frameAncestors: ["'self'", "https://*.zoom.us"], 
    },
  },
}));

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Sessions (for CSRF state). In prod, set cookie.secure = true and trust proxy.
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));

// Serve static files from views directory
app.use(express.static('views'));

// Routes


app.use('/auth', oauthRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'zoom-team-chatbot',
    version: '1.0.0'
  });
});



// View routes
app.get('/dashboard', (_req, res) => {
  res.sendFile('dashboard.html', { root: 'views' });
});

app.get('/webview', (_req, res) => {
  res.sendFile('webview.html', { root: 'views' });
});

app.get('/', (_req, res) => {
  res.sendFile('index.html', { root: 'views' });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Zoom Team Chatbot API',
    version: '1.0.0',
    endpoints: {
      home: '/',
      health: '/health',
      webhooks: '/webhooks',
      api: '/api',
      dashboard: '/dashboard'
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
