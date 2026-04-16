import type { EcoScore, UsageEvent } from './models.js';
import { MODEL_ENERGY_PROFILES } from './constants.js';

/**
 * Calculate an eco-score based on total token usage and model efficiency.
 *
 * Scoring factors:
 * - Total token volume (lower is greener)
 * - Model efficiency (smaller models get a bonus)
 *
 * Grade thresholds (daily usage):
 *   A+: < 500 tokens        (minimal use)
 *   A:  < 5,000 tokens      (light use)
 *   B:  < 25,000 tokens     (moderate use)
 *   C:  < 100,000 tokens    (heavy use)
 *   D:  < 500,000 tokens    (power user)
 *   F:  >= 500,000 tokens   (extreme use)
 */
export function calculateEcoScore(totalTokens: number, events: UsageEvent[]): EcoScore {
  // Base score from token volume (0-70 points)
  let volumeScore: number;
  if (totalTokens < 500)         volumeScore = 70;
  else if (totalTokens < 5000)   volumeScore = 60;
  else if (totalTokens < 25000)  volumeScore = 45;
  else if (totalTokens < 100000) volumeScore = 30;
  else if (totalTokens < 500000) volumeScore = 15;
  else                           volumeScore = 0;

  // Efficiency bonus (0-30 points) based on average model efficiency
  let efficiencyScore = 15; // default middle score
  if (events.length > 0) {
    const avgEfficiency = events.reduce((sum, e) => {
      const profile = MODEL_ENERGY_PROFILES[e.model] ?? MODEL_ENERGY_PROFILES['default'];
      // Lower energy per token = more efficient = higher score
      const efficiency = 1 / (profile.outputKwhPer1kTokens * 1000);
      return sum + efficiency;
    }, 0) / events.length;

    // Normalize: most efficient models (~0.0012 kWh/1K) get 30, least (~0.012) get 0
    efficiencyScore = Math.min(30, Math.max(0, Math.round(avgEfficiency * 30 * 1000 * 0.012)));
  }

  const value = Math.min(100, volumeScore + efficiencyScore);
  const grade = scoreToGrade(value);

  return { grade, value };
}

function scoreToGrade(value: number): EcoScore['grade'] {
  if (value >= 90) return 'A+';
  if (value >= 75) return 'A';
  if (value >= 55) return 'B';
  if (value >= 35) return 'C';
  if (value >= 15) return 'D';
  return 'F';
}
