/**
 * Real ChatGPT SSE data lines for testing parseChatGPTStream().
 * Based on the ChatGPT conversation API format (backend-api/conversation).
 */

/** A normal content message with model metadata */
export const CHATGPT_CONTENT_EVENT = JSON.stringify({
  message: {
    id: 'msg-abc123',
    content: {
      content_type: 'text',
      parts: ['Hello! How can I help you today?'],
    },
    metadata: {
      model_slug: 'gpt-4o',
    },
    status: 'in_progress',
  },
  conversation_id: 'conv-xyz',
});

/** A streaming partial content update */
export const CHATGPT_PARTIAL_EVENT = JSON.stringify({
  message: {
    id: 'msg-abc123',
    content: {
      content_type: 'text',
      parts: ['Hello! How can I help'],
    },
    metadata: {
      model_slug: 'gpt-4o-mini',
    },
    status: 'in_progress',
  },
});

/** A message with no content parts */
export const CHATGPT_EMPTY_PARTS = JSON.stringify({
  message: {
    id: 'msg-abc123',
    content: {
      content_type: 'text',
      parts: [],
    },
    metadata: {
      model_slug: 'gpt-4o',
    },
  },
});

/** A message with no message field at all */
export const CHATGPT_NO_MESSAGE = JSON.stringify({
  conversation_id: 'conv-xyz',
  error: null,
});

/** The stream end marker */
export const CHATGPT_DONE = '[DONE]';
