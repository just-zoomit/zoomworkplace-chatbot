import fetch from 'node-fetch';
import { getChatbotToken } from './zoom-auth.js';

const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';
const ZOOM_OAUTH_TOKEN_URL = process.env.ZOOM_OAUTH_TOKEN_URL || 'https://zoom.us/oauth/token';

/**
 * Build HTTP Basic auth header value for client credentials.
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {string} e.g., "Basic abc123..."
 */
export function buildBasicAuth(clientId, clientSecret) {
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
      Authorization: buildBasicAuth(clientId, clientSecret),
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

/**
 * Send a message to Zoom Team Chat
 * @param {string} toJid - Recipient JID (user or channel)
 * @param {string} message - Message content
 * @param {string} [replyTo] - Optional message ID to reply to
 * @returns {Promise<Object>} API response
 */
export async function sendChatMessage(toJid, message, replyTo = null) {
  try {
    
    const accessToken = await getChatbotToken();
    
    const body = {
      account_id: "5YQGYK-FSc-0M0DgZTCzkQ",
      "content": {
          "head": {
           "text": "Hello World"
          },
          "body": [
           {
            "type": "message",
            "text": message
           }
          ]
         },
      robot_jid: "v1nhrah1hrqhuexexb5nn5-a@xmpp.zoom.us",
      to_jid: 'vbdj8euxrduts0tan29tra@xmpp.zoom.us',
      user_jid: "vbdj8euxrduts0tan29tra@xmpp.zoom.us",
      
    };

    console.log('Preparing to send message to Zoom Team Chat:', body);

    if (replyTo) {
      body.reply_to = replyTo;
    }

    const response = await fetch(`${ZOOM_API_BASE_URL}/im/chat/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send message: ${error.message || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Get chat messages
 * @param {string} toJid - Chat JID
 * @param {Object} options - Query options (page_size, next_page_token, etc.)
 * @returns {Promise<Object>} API response
 */
export async function getChatMessages(toJid, options = {}) {
  try {
    const accessToken = await getChatbotToken();
    
    const queryParams = new URLSearchParams({
      to_jid: toJid,
      page_size: options.page_size || '10',
      ...options
    });

    const response = await fetch(`${ZOOM_API_BASE_URL}/im/chat/messages?${queryParams}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get messages: ${error.message || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
}

