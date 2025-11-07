import express from 'express';
import { validateWebhookPayload, createValidationMiddleware } from '../utils/validation.js';

import { sendChatMessage } from '../utils/zoom-api.js';
// import { callAnthropicAPI } from '../utils/anthropic.js';

const router = express.Router();

/**
 * Handles Zoom Team Chat webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleZoomWebhook(req, res) {
  try {
    const { event, payload } = req.body;
    
    console.log(`Received Zoom webhook event: ${event}`);
    console.log('Payload:', payload);

    const toJid = payload?.toJid;
    const message = payload?.cmd || payload?.message || '';
    const userId = payload?.userJid;
    const accountId = payload?.accountId;
    const robot_jid = payload?.robotJid;

   

    switch (event) {
      case 'bot_installed':
        
        console.log('Zoom Team Chat bot installed successfully');
        break;

      case 'bot_notification':
        console.log('Processing bot notification from Zoom Team Chat');
        //sendChatMessage(toJid, message );
        await callAnthropicAPI(payload, true);
        break;
      
      case 'interactive_message_actions'  :
        console.log('Processing interactive message action from Zoom Team Chat');
        sendChatMessage(toJid, `You clicked a button with value: ${payload?.actionItem?.value || 'unknown'}`);
        break;

      case 'app_deauthorized':
        console.log('Zoom Team Chat bot uninstalled');
        break;

      case 'endpoint.url_validation':
        console.log('Validating webhook endpoint URL');
        return res.status(200).json({
          message: {
            plainToken: payload?.plainToken || 'missing_token',
          },
        });

      default:
        console.log(`Unsupported Zoom webhook event type: ${event}`);
        break;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Event processed successfully',
      event 
    });

  } catch (error) {
    console.error('Error handling Zoom webhook event:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}

// Webhook route with validation
router.post('/', createValidationMiddleware(validateWebhookPayload), handleZoomWebhook);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'zoom-webhook-handler'
  });
});

export default router;