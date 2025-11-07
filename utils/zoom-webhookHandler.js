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
                sendChatMessage(toJid, message);
                //await callAnthropicAPI(payload, true);
                break;

            case 'interactive_message_actions':
                console.log('Processing interactive message action from Zoom Team Chat');
                sendChatMessage(toJid, `You clicked a button with value: ${payload?.actionItem?.value || 'unknown'}`);

                break;

            case "team_chat.app_mention":
                console.log("team_chat.app_mention", {
                    channel_name: payload.object?.channel_name,
                    channel: payload.object?.channel_id || payload.object?.channel_name,
                    message: payload.object?.message,
                    message_id: payload.object?.message_id,
                    robot_jid: payload.object?.robot_jid || payload.object?.robot_name,
                    resourceId: payload.object?.resourceId,
                });


                // TODO: respond in thread or DM based on your bot behavior
                // await callAnthropicAPI(payload);

                break;

            // Triggers when slash command is used in team chat channel
            case "team_chat.app_conversation_opened":

                console.log("team_chat.app_conversation_opened", {
                    type: payload.object?.type,
                    to_jid: payload.object?.to_jid,
                    trigger_id: payload.object?.trigger_id,
                    user_jid: payload.object?.user_jid,
                    operator_id: payload?.operator_id,
                });
                // TODO: respond in thread or DM based on your bot behavior
                // await callAnthropicAPI(payload);
                break;

            case "team_chat.app_invited":
                console.log("team_chat.app_invited", {
                    channel_name: payload.object?.channel_name,
                    channel: payload.object?.channel_id,
                    operator: payload?.operator_id,
                    user_jid: payload.object?.user_jid,
                    to_jid: payload.object?.to_jid,
                });

                // TODO: greet channel or set up state
                // await callAnthropicAPI(payload);

                break;

            // This may be incorrectly labled should be team_chat.channel_invited
            case "team_chat.channel_app_added":
                console.log("team_chat.channel_app_added", {
                    channel_name: payload.object?.channel_name,
                    channel: payload.object?.channel_id,
                    operator: payload?.operator_id,
                    user_jid: payload.object?.user_jid,
                    to_jid: payload.object?.to_jid,
                });
                break;

            case "team_chat.app_removed":

                // This may be incorrectly labled should be team_chat.channel_app_removed
                console.log("team_chat.channel_app_removed", {
                    channel_name: payload.object?.channel_name,
                    channel: payload.object?.channel_id,
                    operator: payload?.operator_id,
                    user_jid: payload.object?.user_jid,
                    to_jid: payload.object?.to_jid,
                });
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