import { describe, it, expect } from 'vitest';
import { resolveStageKey } from '@/lib/scorecardTemplates';

describe('Interview Kit stage resolution', () => {
  it('resolves Screening stages correctly to screening key', () => {
    expect(resolveStageKey('Screening')).toBe('screening');
    expect(resolveStageKey('Phone Screen')).toBe('screening');
    expect(resolveStageKey('Recruiter Prescreen')).toBe('screening');
    expect(resolveStageKey('Triagem')).toBe('general'); // unless customized
  });

  it('resolves Technical stages correctly', () => {
    expect(resolveStageKey('Technical Round')).toBe('technical');
    expect(resolveStageKey('Coding Challenge')).toBe('technical');
    expect(resolveStageKey('System Design')).toBe('technical');
  });

  it('resolves Managerial stages correctly', () => {
    expect(resolveStageKey('Managerial / Panel')).toBe('managerial');
    expect(resolveStageKey('Leadership')).toBe('managerial');
  });

  it('resolves HR / Final stages correctly', () => {
    expect(resolveStageKey('HR / Final Round')).toBe('hr_final');
    expect(resolveStageKey('Culture Fit')).toBe('hr_final');
  });

  it('falls back to general for null or undefined', () => {
    expect(resolveStageKey(null)).toBe('general');
    expect(resolveStageKey(undefined)).toBe('general');
    expect(resolveStageKey('')).toBe('general');
  });
});
