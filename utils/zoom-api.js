import fetch from 'node-fetch';
import { getChatbotToken } from './zoom-chatbot-auth.js';

const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';
const ZOOM_OAUTH_TOKEN_URL = process.env.ZOOM_OAUTH_TOKEN_URL || 'https://zoom.us/oauth/token';

/**
 * Build OAuth authorization URL for Zoom
 * @param {{ clientId: string, redirectUri: string, state: string }}
 * @returns {string} OAuth authorization URL
 */
export function buildBasicAuth({ clientId, redirectUri, state }) {
  if (!clientId) {
    throw new Error('Missing Zoom client credentials');
  }
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri || process.env.ZOOM_REDIRECT_URI,
    state: state
  });
  
  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

/**
 * Build HTTP Basic auth header value for client credentials.
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {string} e.g., "Basic abc123..."
 */
export function buildBasicAuthHeader(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    throw new Error('Missing Zoom client credentials.');
  }
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
}

/**
 * Exchange authorization code for tokens.
 * @param {{ code: string, redirectUri: string, clientId: string, clientSecret: string }}
 * @returns {Promise<{ access_token: string, refresh_token?: string, expires_in?: number }>}
 */
export async function exchangeCodeForAccessToken({
  code,
  redirectUri,
  clientId,
  clientSecret,
}) {
  if (!code || !redirectUri) {
    throw new Error('Missing code or redirectUri.');
  }

  const res = await fetch(ZOOM_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  return res.json();
}

