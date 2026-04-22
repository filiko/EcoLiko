/**
 * Heuristic token estimator for when exact counts are unavailable.
 *
 * Most LLM tokenizers produce roughly 1 token per 4 characters for English text,
 * and ~1 token per 3.5 characters for code (more special tokens/punctuation).
 *
 * Accuracy: within ~20% of actual token counts, which is acceptable for
 * environmental impact estimates (which themselves have wide uncertainty bands).
 */
export function estimateTokenCount(
  text: string,
  type: 'text' | 'code' = 'text'
): number {
  if (!text) return 0;
  const charsPerToken = type === 'code' ? 3.5 : 4.0;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Detect whether text is likely code based on simple heuristics.
 */
export function detectContentType(text: string): 'text' | 'code' {
  const codeIndicators = [
    /^(import|export|const|let|var|function|class|def|fn|pub|use)\s/m,
    /[{}\[\]();]/g,
    /^\s*(\/\/|#|\/\*|\*)/m,
    /=>/,
    /\w+\.\w+\(/,
  ];

  let codeScore = 0;
  for (const pattern of codeIndicators) {
    if (pattern.test(text)) codeScore++;
  }

  return codeScore >= 2 ? 'code' : 'text';
}
