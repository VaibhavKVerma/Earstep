/** Central mastery and star-rating thresholds for the Journey. */

export const MASTERY_ACCURACY = 0.85;
export const MIN_QUESTIONS = 30;
export const MIN_PER_NOTE = 8;

export const STAR_BANDS = [
  { stars: 5, min: 0.98 },
  { stars: 4, min: 0.95 },
  { stars: 3, min: 0.9 },
  { stars: 2, min: 0.8 },
  { stars: 1, min: 0.7 },
] as const;

export interface MasteryCriteria {
  minimumQuestions: number;
  accuracy: number;
  minPerNote?: number;
}

export const DEFAULT_MASTERY: MasteryCriteria = {
  minimumQuestions: MIN_QUESTIONS,
  accuracy: MASTERY_ACCURACY,
  minPerNote: MIN_PER_NOTE,
};

export function starCount(accuracy: number): number {
  for (const band of STAR_BANDS) {
    if (accuracy >= band.min) return band.stars;
  }
  return 0;
}

export function meetsMastery(
  questions: number,
  accuracy: number,
  criteria: MasteryCriteria = DEFAULT_MASTERY,
): boolean {
  return questions >= criteria.minimumQuestions && accuracy >= criteria.accuracy;
}
