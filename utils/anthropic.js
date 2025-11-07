// anthropic.js
import dotenv from 'dotenv';
import { sendChatMessage } from './zoom-api.js';

dotenv.config();

let conversationHistory = new Map();

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
// ⚠️ Use a model your key actually has access to. Consider resolving via /v1/models at boot.
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

function buildHeaders() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY in environment variables.');
  if (!apiKey.startsWith('sk-ant-')) throw new Error('Invalid ANTHROPIC_API_KEY format. Should start with "sk-ant-".');

  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };
}

function buildRequestBody({ model, messages, stream }) {
  return {
    model,
    max_tokens: 1000,
    temperature: 0.7,
    system:
      'You are a helpful AI assistant integrated with Zoom Team Chat. Provide concise, helpful responses to user questions and requests.',
    messages,
    stream,
  };
}

/**
 * Main entry point.
 * @param {Object} payload - Zoom webhook payload containing toJid / message
 * @param {Object} options - { stream?: boolean, onStreamChunk?: (chunk, soFar) => void }
 */
export async function callAnthropicAPI(payload, options = {}) {
  const userJid = payload?.toJid;
  if (!userJid) {
    console.error('Error: payload.toJid is missing.');
    return;
  }

  const { stream = true, onStreamChunk = null } = options;

  try {
    const headers = buildHeaders();

    // Build conversation
    const history = conversationHistory.get(userJid) || [];
    const userMessage = { role: 'user', content: payload.cmd || payload.message || 'Hello' };
    history.push(userMessage);

    const requestData = buildRequestBody({
      model: DEFAULT_MODEL,
      messages: history,
      stream,
    });

    console.log(`Sending message to Anthropic (model=${DEFAULT_MODEL}, stream=${stream}) for user: ${userJid}`);

    const completion = stream
      ? await handleStreamingResponse(requestData, headers, userJid, payload, onStreamChunk)
      : await handleNonStreamingResponse(requestData, headers, userJid, payload);

    return completion;
  } catch (error) {
    console.error('Error in callAnthropicAPI:', error?.message || error);

    try {
      await sendChatMessage(
        payload?.toJid,
        'Sorry, I hit an AI model error. I will be back shortly. (Check model access/config.)',
        payload?.reply_to || null
      );
    } catch (sendError) {
      console.error('Failed to send error message to user:', sendError?.message || sendError);
    }

    // Normalize Anthropic error logging
    const status = error?.status ?? error?.response?.status;
    const data = error?.response?.data ?? error?.message;
    if (status) {
      console.error('Anthropic API Error:', { status, data });
      if (status === 401) console.error('Authentication failed. Check ANTHROPIC_API_KEY.');
      if (status === 429) console.error('Rate limit exceeded.');
      if (status === 400) console.error('Bad request (params/schema).');
      if (status === 404) console.error('Model not found for your account/region.');
    } else if (error?.request) {
      console.error('No response from Anthropic API:', error.message);
    }
  }
}

/**
 * Non-streaming path using native fetch.
 */
async function handleNonStreamingResponse(requestData, headers, userJid, payload) {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...requestData, stream: false }),
  });

  if (!response.ok) {
    // try to read JSON, fall back to text
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: await response.text() };
    }
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    error.response = { data: errorData };
    throw error;
  }

  const data = await response.json();

  if (!data?.content || !Array.isArray(data.content)) {
    throw new Error(`Unexpected response from Anthropic API: ${JSON.stringify(data)}`);
  }

  const completion = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!completion) throw new Error('Empty response from Anthropic API');

  // Append assistant message & trim history
  const history = conversationHistory.get(userJid) || [];
  history.push({ role: 'assistant', content: completion });
  conversationHistory.set(userJid, history.length > 20 ? history.slice(-20) : history);

  await sendChatMessage(userJid, completion, payload.reply_to || null);
  console.log('Successfully sent response to Zoom Team Chat');

  return completion;
}

/**
 * Streaming path using native fetch + Web Streams.
 * Parses Server-Sent Events (SSE): frames separated by blank line, with "event:" and "data:" lines.
 */
async function handleStreamingResponse(requestData, headers, userJid, payload, onStreamChunk) {
  // IMPORTANT for SSE:
  const sseHeaders = {
    ...headers,
    Accept: 'text/event-stream',
  };

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: sseHeaders,
    body: JSON.stringify({ ...requestData, stream: true }),
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: await response.text() };
    }
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    error.response = { data: errorData };
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let completion = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line (\n\n)
      let sep;
      while ((sep = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, sep);
        buf = buf.slice(sep + 2);

        let eventType = '';
        let dataLine = '';

        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
        }

        if (!dataLine) continue;
        if (dataLine === '[DONE]') {
          // Some providers use this sentinel; Anthropic also sends message_stop events
          continue;
        }

        try {
          const parsed = JSON.parse(dataLine);

          // Anthropic streaming lifecycle:
          // - content_block_start
          // - content_block_delta (delta.type === 'text_delta', delta.text)
          // - content_block_stop
          // - message_stop
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            const chunk = parsed.delta.text || '';
            if (chunk) {
              completion += chunk;
              onStreamChunk?.(chunk, completion);
            }
          }

          if (parsed.type === 'message_stop' || eventType === 'message_stop') {
            // End of message
            // Clear buf in case anything remains
            buf = '';
          }
        } catch {
          // Ignore malformed pieces
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }

  if (!completion.trim()) {
    throw new Error('Empty response from Anthropic streaming API');
  }

  // Append assistant message & trim history
  const history = conversationHistory.get(userJid) || [];
  history.push({ role: 'assistant', content: completion });
  conversationHistory.set(userJid, history.length > 20 ? history.slice(-20) : history);

  // Send the full completion to Zoom (the streaming UI can also show partials via onStreamChunk)
  await sendChatMessage(userJid, completion, payload.reply_to || null);
  console.log('Successfully sent streaming response to Zoom Team Chat');

  return completion;
}

export async function callAnthropicAPIStreaming(payload, onStreamChunk) {
  return callAnthropicAPI(payload, {
    stream: true,
    onStreamChunk,
  });
}

export function clearConversationHistory(userJid) {
  conversationHistory.delete(userJid);
  console.log(`Cleared conversation history for user: ${userJid}`);
}

export function getConversationHistory(userJid) {
  return conversationHistory.get(userJid) || [];
}
