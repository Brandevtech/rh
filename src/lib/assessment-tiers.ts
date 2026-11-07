export type AssessmentTier =
  | 'tech_fresher'
  | 'tech_junior'
  | 'tech_mid'
  | 'tech_senior'
  | 'nontech_fresher'
  | 'nontech_experienced';

export const ASSESSMENT_TIERS: AssessmentTier[] = [
  'tech_fresher',
  'tech_junior',
  'tech_mid',
  'tech_senior',
  'nontech_fresher',
  'nontech_experienced',
];

export const assessmentTierLabels: Record<AssessmentTier, string> = {
  tech_fresher: 'Técnico — Iniciante (0–1 ano)',
  tech_junior: 'Técnico — Júnior (1–3 anos)',
  tech_mid: 'Técnico — Pleno (3–5 anos)',
  tech_senior: 'Técnico — Sênior (5+ anos)',
  nontech_fresher: 'Não-técnico — Iniciante (0–1 ano)',
  nontech_experienced: 'Não-técnico — Experiente (2+ anos)',
};

export function isNonTechAssessmentTier(tier: AssessmentTier): boolean {
  return tier === 'nontech_fresher' || tier === 'nontech_experienced';
}
