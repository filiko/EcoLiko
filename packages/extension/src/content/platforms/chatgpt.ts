/**
 * ChatGPT SSE stream parser.
 * ChatGPT sends SSE events like: data: {"message":{"content":{"parts":["text"]},...},...}
 * We accumulate text to estimate token counts.
 */
export function parseChatGPTStream(data: string): { text: string; model?: string } | null {
  if (data === '[DONE]') return null;

  try {
    const parsed = JSON.parse(data);

    // ChatGPT conversation API format
    const message = parsed?.message;
    if (!message) return null;

    const model = message?.metadata?.model_slug;
    const parts = message?.content?.parts;

    if (Array.isArray(parts) && parts.length > 0) {
      const text = parts.filter((p: unknown) => typeof p === 'string').join('');
      return { text, model: normalizeModel(model) };
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

function normalizeModel(slug: string | undefined): string {
  if (!slug) return 'gpt-4o';
  if (slug.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (slug.includes('gpt-4o')) return 'gpt-4o';
  if (slug.includes('gpt-4.1-mini')) return 'gpt-4.1-mini';
  if (slug.includes('gpt-4.1-nano')) return 'gpt-4.1-nano';
  if (slug.includes('gpt-4.1')) return 'gpt-4.1';
  if (slug.includes('o3-mini')) return 'o3-mini';
  if (slug.includes('o4-mini')) return 'o4-mini';
  if (slug.includes('o3')) return 'o3';
  return slug;
}
