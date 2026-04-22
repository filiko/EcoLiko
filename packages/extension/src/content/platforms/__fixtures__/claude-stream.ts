/**
 * Real Claude SSE data lines for testing parseClaudeStream().
 * Based on the Claude.ai streaming API format.
 */

/** message_start event — contains model info */
export const CLAUDE_MESSAGE_START = JSON.stringify({
  type: 'message_start',
  message: {
    id: 'msg_01XFDUDYJgAACzvnptvVoYEL',
    type: 'message',
    role: 'assistant',
    content: [],
    model: 'claude-sonnet-4-20250514',
    stop_reason: null,
    usage: {
      input_tokens: 25,
      output_tokens: 1,
    },
  },
});

/** content_block_start event */
export const CLAUDE_CONTENT_BLOCK_START = JSON.stringify({
  type: 'content_block_start',
  index: 0,
  content_block: {
    type: 'text',
    text: '',
  },
});

/** content_block_delta event — the actual text streaming */
export const CLAUDE_TEXT_DELTA = JSON.stringify({
  type: 'content_block_delta',
  index: 0,
  delta: {
    type: 'text_delta',
    text: 'Hello! How can I assist you today?',
  },
});

/** Another text delta (partial) */
export const CLAUDE_TEXT_DELTA_PARTIAL = JSON.stringify({
  type: 'content_block_delta',
  index: 0,
  delta: {
    type: 'text_delta',
    text: ' Let me know',
  },
});

/** content_block_stop event */
export const CLAUDE_CONTENT_BLOCK_STOP = JSON.stringify({
  type: 'content_block_stop',
  index: 0,
});

/** message_delta event — final usage info */
export const CLAUDE_MESSAGE_DELTA = JSON.stringify({
  type: 'message_delta',
  delta: {
    stop_reason: 'end_turn',
    stop_sequence: null,
  },
  usage: {
    output_tokens: 15,
  },
});

/** ping event — should be ignored */
export const CLAUDE_PING = JSON.stringify({
  type: 'ping',
});
