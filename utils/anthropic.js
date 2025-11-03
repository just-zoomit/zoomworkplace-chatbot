import axios from 'axios';
import dotenv from 'dotenv';
import { sendChatMessage } from './zoom-api.js';

dotenv.config();

let conversationHistory = new Map();
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

export async function callAnthropicAPI(payload) {
  const userJid = payload?.toJid;
  if (!userJid) {
    console.error('Error: payload.toJid is missing.');
    return;
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY in environment variables.');
    if (!apiKey.startsWith('sk-ant-')) throw new Error('Invalid ANTHROPIC_API_KEY format. Should start with "sk-ant-".');

    const history = conversationHistory.get(userJid) || [];
    const userMessage = { role: 'user', content: payload.cmd || payload.message || 'Hello' };
    history.push(userMessage);

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    // Helper to call Anthropic with a given model
    async function invokeAnthropic(model) {
      const requestData = {
        model,
        max_tokens: 1000,
        temperature: 0.7,
        system: "You are a helpful AI assistant integrated with Zoom Team Chat. Provide concise, helpful responses to user questions and requests.",
        messages: history, // string content is fine; Anthropic accepts this
      };

      return axios.post(ANTHROPIC_URL, requestData, { headers, timeout: 30000 });
    }

    console.log(`Sending message to Anthropic (model=${DEFAULT_MODEL}) for user: ${userJid}`);

    let response;
    try {
      response = await invokeAnthropic(DEFAULT_MODEL);
    } catch (err) {
      // If model not found, retry once with a safe fallback alias
      const status = err?.response?.status;
      const msg = err?.response?.data?.error?.message || err?.message || '';
      const isNotFound = status === 404 || /not_found/i.test(msg) || /model.*not.*found/i.test(msg);

      if (isNotFound && DEFAULT_MODEL !== 'claude-3-5-sonnet-latest') {
        console.warn(`Model not found (${DEFAULT_MODEL}). Retrying with fallback "claude-3-5-sonnet-latest".`);
        response = await invokeAnthropic('claude-3-5-sonnet-latest');
      } else {
        throw err;
      }
    }

    if (!response?.data?.content || !Array.isArray(response.data.content)) {
      throw new Error(`Unexpected response from Anthropic API: ${JSON.stringify(response?.data)}`);
    }

    const completion = response.data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    if (!completion) throw new Error('Empty response from Anthropic API');

    // Append assistant message & trim history
    history.push({ role: 'assistant', content: completion });
    conversationHistory.set(userJid, history.length > 20 ? history.slice(-20) : history);

    await sendChatMessage(userJid, completion, payload.reply_to || null);
    console.log('Successfully sent response to Zoom Team Chat');

  } catch (error) {
    console.error('Error in callAnthropicAPI:', error?.message || error);

    try {
      await sendChatMessage(
        payload?.toJid,
        'Sorry, I hit an AI model error. I’ll be back shortly. (Check model access/config.)',
        payload?.reply_to || null
      );
    } catch (sendError) {
      console.error('Failed to send error message to user:', sendError?.message || sendError);
    }

    if (error.response) {
      console.error('Anthropic API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      if (error.response.status === 401) console.error('Authentication failed. Check ANTHROPIC_API_KEY.');
      if (error.response.status === 429) console.error('Rate limit exceeded.');
      if (error.response.status === 400) console.error('Bad request (params/schema).');
      if (error.response.status === 404) console.error('Model not found for your account/region.');
    } else if (error.request) {
      console.error('No response from Anthropic API:', error.message);
    }
  }
}

export function clearConversationHistory(userJid) {
  conversationHistory.delete(userJid);
  console.log(`Cleared conversation history for user: ${userJid}`);
}

export function getConversationHistory(userJid) {
  return conversationHistory.get(userJid) || [];
}
