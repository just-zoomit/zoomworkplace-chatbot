import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import messageRoutes from './routes/message-routes.js';
import webhookRoutes from './routes/zoom-webhookHandler.js';
import { validateEnvironmentVariables } from './utils/validation.js';

import {buildBasicAuth, exchangeCodeForAccessToken}  from './utils/zoom-api.js';

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

// Serve static files from views directory
app.use(express.static('views'));

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

// Sessions (for CSRF state). In prod, set cookie.secure = true and trust proxy.
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));


// --- OAuth: start ---
app.get('/auth/login', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauth_state = state;

    const url = buildBasicAuth({
      clientId: process.env.ZOOM_CLIENT_ID,
      redirectUri: process.env.ZOOM_REDIRECT_URI,
      state,
    });

    console.log('Redirecting to Zoom OAuth URL:', url);

    return res.redirect(url);
  } catch (e) {
    console.error('OAuth login error:', e);
    return res.status(500).send('OAuth not configured.');
  }
});

// --- OAuth: callback ---
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.warn('Zoom authorization error:', error, error_description);
      return res.status(400).send(`Authorization error: ${error}`);
    }
    if (!code || !state) return res.status(400).send('Missing code or state.');
    if (state !== req.session.oauth_state) return res.status(400).send('Invalid state.');
    delete req.session.oauth_state; // one-time use

    const tokens = await exchangeCodeForAccessToken({
      code,
      redirectUri: process.env.ZOOM_REDIRECT_URI,
      clientId: process.env.ZOOM_CLIENT_ID,
      clientSecret: process.env.ZOOM_CLIENT_SECRET,
    });

    // Demo: store tokens in session (use DB/secret store in prod)
    req.session.zoomTokens = tokens;

    // Option A: redirect to a confirmation page with a button to open in Zoom
    return res.redirect('/dashboard');

    // Option B: redirect straight into Zoom via a JID deep link:
    // return res.redirect(process.env.ROBOT_ZOOM_BOT_JID || 'https://zoom.us/launch/chat?jid=robot_example@xmpp.zoom.us');
  } catch (e) {
    console.error('OAuth callback error:', e);
    return res.status(500).send('Token exchange failed.');
  }
});

// View routes

app.get('/dashboard', (_req, res) => {
  res.sendFile('dashboard.html', { root: 'views' });
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
