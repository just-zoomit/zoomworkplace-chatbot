import express from 'express';
import crypto from 'crypto';
import { buildBasicAuth, exchangeCodeForAccessToken } from '../utils/zoom-api.js';

const router = express.Router();

// OAuth: start
router.get('/login', (req, res) => {
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

// OAuth: callback
router.get('/callback', async (req, res) => {
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

export default router;