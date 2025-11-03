import express from 'express';
import fetch from 'node-fetch';
import { getChatbotToken } from '../utils/zoom-auth.js';
import { validateMessagePayload, createValidationMiddleware, sanitizeMessage } from '../utils/validation.js';

const router = express.Router();

/**
 * POST /api/message
 * Sends a message to a Zoom Team Chat channel or user.
 * Optional: include `reply_to` for threaded replies.
 */
router.post('/message', createValidationMiddleware(validateMessagePayload), async (req, res) => {
  try {
    const { to_jid, message, reply_to } = req.body;

    // Sanitize message content
    const sanitizedMessage = sanitizeMessage(message);

    // Retrieve OAuth token from helper (Server-to-Server)
    const accessToken = await getChatbotToken();

    // Construct request body for Zoom API
    const body = {
      to_jid,
      message: sanitizedMessage,
    };

    // Optional: add reply_to to nest the message in a thread
    if (reply_to) body.reply_to = reply_to;

    const response = await fetch('https://api.zoom.us/v2/im/chat/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Zoom API error:', data);
      return res.status(response.status).json({
        success: false,
        error: 'Zoom API error',
        details: data
      });
    }

    console.log('Message sent successfully:', data);
    return res.status(200).json({
      success: true,
      message: 'Message sent successfully!',
      data,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  }
});

export default router;
