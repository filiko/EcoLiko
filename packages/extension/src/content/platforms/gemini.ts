/**
 * Gemini SSE stream parser.
 * Gemini uses a different streaming format with candidates[].content.parts[].text
 */
export function parseGeminiStream(data: string): { text: string; model?: string } | null {
  try {
    const parsed = JSON.parse(data);

    // Gemini streaming response format
    const candidates = parsed?.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts;
      if (Array.isArray(parts)) {
        const text = parts
          .filter((p: { text?: string }) => typeof p.text === 'string')
          .map((p: { text: string }) => p.text)
          .join('');
        return { text, model: parsed?.modelVersion ? normalizeModel(parsed.modelVersion) : undefined };
      }
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

function normalizeModel(model: string): string {
  if (model.includes('flash')) return 'gemini-2.0-flash';
  if (model.includes('pro')) return 'gemini-2.5-pro';
  return model;
}
