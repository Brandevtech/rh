import { describe, it, expect } from 'vitest';
import { resolveStageKey, translateStageName } from '@/lib/scorecardTemplates';

describe('Interview Kit stage resolution', () => {
  it('resolves Screening stages correctly to screening key', () => {
    expect(resolveStageKey('Screening')).toBe('screening');
    expect(resolveStageKey('Phone Screen')).toBe('screening');
    expect(resolveStageKey('Recruiter Prescreen')).toBe('screening');
    expect(resolveStageKey('Triagem')).toBe('screening');
  });

  it('resolves Technical stages correctly', () => {
    expect(resolveStageKey('Technical Round')).toBe('technical');
    expect(resolveStageKey('Coding Challenge')).toBe('technical');
    expect(resolveStageKey('System Design')).toBe('technical');
    expect(resolveStageKey('Fase Técnica')).toBe('technical');
  });

  it('resolves Managerial stages correctly', () => {
    expect(resolveStageKey('Managerial / Panel')).toBe('managerial');
    expect(resolveStageKey('Leadership')).toBe('managerial');
    expect(resolveStageKey('Entrevista com Gestor')).toBe('managerial');
  });

  it('resolves HR / Final stages correctly', () => {
    expect(resolveStageKey('HR / Final Round')).toBe('hr_final');
    expect(resolveStageKey('Culture Fit')).toBe('hr_final');
    expect(resolveStageKey('Entrevista RH')).toBe('hr_final');
  });

  it('falls back to general for null or undefined', () => {
    expect(resolveStageKey(null)).toBe('general');
    expect(resolveStageKey(undefined)).toBe('general');
    expect(resolveStageKey('')).toBe('general');
  });

  it('translates stage names to Portuguese correctly', () => {
    expect(translateStageName('Screening')).toBe('Triagem');
    expect(translateStageName('Phone Screen')).toBe('Triagem por Telefone');
    expect(translateStageName('Technical Round')).toBe('Entrevista Técnica');
    expect(translateStageName('Managerial / Panel')).toBe('Entrevista com Gestor / Painel');
    expect(translateStageName('HR / Final Round')).toBe('RH / Rodada Final');
    expect(translateStageName('General Interview')).toBe('Entrevista Geral');
    expect(translateStageName('Etapa Customizada')).toBe('Etapa Customizada');
    expect(translateStageName(null)).toBe('');
    expect(translateStageName(undefined)).toBe('');
  });
});
