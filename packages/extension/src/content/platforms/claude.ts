/**
 * Claude.ai SSE stream parser.
 * Claude sends SSE events with content_block_delta containing text deltas.
 */
export function parseClaudeStream(data: string): { text: string; model?: string } | null {
  try {
    const parsed = JSON.parse(data);

    // content_block_delta events contain the actual text
    if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
      return { text: parsed.delta.text };
    }

    // message_start contains the model info
    if (parsed.type === 'message_start' && parsed.message?.model) {
      return { text: '', model: normalizeModel(parsed.message.model) };
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

function normalizeModel(model: string): string {
  if (model.startsWith('claude-opus-4')) return 'claude-opus-4';
  if (model.startsWith('claude-sonnet-4')) return 'claude-sonnet-4';
  if (model.includes('haiku')) return 'claude-haiku-3.5';
  return model;
}
