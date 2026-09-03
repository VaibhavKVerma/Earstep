import { describe, expect, it } from 'vitest';
import {
  applyDifficulty,
  defaultConfig,
  generateOctaveQuestions,
  generateQuestions,
  mistakeWeights,
  validateOctaveAnswer,
  validatePitchClassAnswer,
  weightedNotes,
} from '../src/training/quizEngine';

describe('quiz engine', () => {
  it('only offers the notes the learner selected', () => {
    const questions = generateQuestions({
      notes: ['C', 'D'],
      octaves: [4],
      instrument: 'acoustic',
      questionCount: 20,
      difficulty: 'beginner',
      mode: 'note',
    });
    expect(questions).toHaveLength(20);
    for (const question of questions) {
      expect(question.options).toEqual(['C', 'D']);
      expect(['C', 'D']).toContain(question.note.name);
      expect(question.note.octave).toBe(4);
    }
  });

  it('validates pitch-class answers and exact octaves separately', () => {
    expect(validatePitchClassAnswer('C', 'C')).toBe(true);
    expect(validatePitchClassAnswer('C', 'D')).toBe(false);
    expect(validateOctaveAnswer(60, 60)).toBe(true);
    expect(validateOctaveAnswer(60, 72)).toBe(false);
  });

  it('applies difficulty octaves and default session config', () => {
    const beginner = applyDifficulty(defaultConfig('note', ['C', 'D']));
    expect(beginner.octaves).toEqual([4]);
    expect(beginner.questionCount).toBe(12);
    const easy = applyDifficulty({
      ...defaultConfig('note', ['C', 'D', 'E']),
      difficulty: 'easy',
      octaves: [4],
    });
    expect(easy.octaves).toEqual([3, 4]);
  });

  it('weights weak notes more heavily', () => {
    const weights = mistakeWeights(
      ['C', 'D'],
      { C: { correct: 9, total: 10 }, D: { correct: 2, total: 10 } },
    );
    expect(weights.D).toBeGreaterThan(weights.C);
    const pool = weightedNotes(['C', 'D'], weights);
    expect(pool.filter((name) => name === 'D').length).toBeGreaterThan(pool.filter((name) => name === 'C').length);
  });

  it('builds octave questions for one pitch class', () => {
    const questions = generateOctaveQuestions('C', [3, 4, 5], 8);
    expect(questions).toHaveLength(8);
    for (const question of questions) {
      expect(question.note.name).toBe('C');
      expect([3, 4, 5]).toContain(question.note.octave);
    }
  });
});
