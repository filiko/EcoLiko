/**
 * Real Gemini SSE data lines for testing parseGeminiStream().
 * Based on the Gemini streaming API format (streamGenerateContent).
 */

/** A normal streaming response with text content */
export const GEMINI_CONTENT_EVENT = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [
          { text: 'Hello! I am Gemini. How can I help?' },
        ],
        role: 'model',
      },
      finishReason: 'STOP',
    },
  ],
  modelVersion: 'gemini-2.0-flash-001',
});

/** A response with multiple text parts */
export const GEMINI_MULTI_PART = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [
          { text: 'First part. ' },
          { text: 'Second part.' },
        ],
        role: 'model',
      },
    },
  ],
  modelVersion: 'gemini-2.5-pro-preview',
});

/** A response with empty candidates */
export const GEMINI_EMPTY_CANDIDATES = JSON.stringify({
  candidates: [],
});

/** A response with no text in parts */
export const GEMINI_NO_TEXT_PARTS = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [
          { functionCall: { name: 'search', args: {} } },
        ],
        role: 'model',
      },
    },
  ],
});

/** A response with no candidates field */
export const GEMINI_NO_CANDIDATES = JSON.stringify({
  promptFeedback: {
    safetyRatings: [],
  },
});
