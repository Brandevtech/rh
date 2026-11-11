-- Auto-matricular candidato na primeira etapa (Triagem) e atribuir avaliação automaticamente ao se candidatar
CREATE OR REPLACE FUNCTION public.auto_enroll_and_assign_assessment_on_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _candidate_id uuid;
  _default_assessment_id uuid;
  _assessment_config jsonb;
  _deadline_days int := 7;
  _deadline timestamptz;
  _token_expiry timestamptz;
  _first_stage_id uuid;
  _existing_interview_id uuid;
BEGIN
  _candidate_id := NEW.candidate_id;
  IF _candidate_id IS NULL THEN
    SELECT id INTO _candidate_id
    FROM public.candidates
    WHERE lower(trim(email)) = lower(trim(NEW.applicant_email))
    LIMIT 1;
  END IF;

  IF _candidate_id IS NULL OR NEW.job_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Auto-aprovação: Matricula na primeira etapa do pipeline (ex: Triagem) se ainda não matriculado
  SELECT id INTO _first_stage_id
  FROM public.job_interview_stages
  WHERE job_id = NEW.job_id
  ORDER BY order_index ASC
  LIMIT 1;

  IF _first_stage_id IS NOT NULL THEN
    SELECT id INTO _existing_interview_id
    FROM public.candidate_interviews
    WHERE candidate_id = _candidate_id
      AND job_interview_stage_id = _first_stage_id
    LIMIT 1;

    IF _existing_interview_id IS NOT NULL THEN
      UPDATE public.candidate_interviews
      SET
        removed_from_pipeline_at = NULL,
        removed_by = NULL,
        verdict = NULL,
        advanced_at = NULL,
        advanced_by = NULL,
        enrolled_at = now()
      WHERE id = _existing_interview_id;
    ELSE
      INSERT INTO public.candidate_interviews (candidate_id, job_interview_stage_id, enrolled_at)
      VALUES (_candidate_id, _first_stage_id, now());
    END IF;
  END IF;

  -- 2. Auto-atribuição de Avaliação: Se a vaga tem avaliação padrão vinculada
  SELECT default_assessment_id, assessment_config
  INTO _default_assessment_id, _assessment_config
  FROM public.jobs
  WHERE id = NEW.job_id;

  IF _default_assessment_id IS NOT NULL THEN
    IF _assessment_config ? 'deadline_days' THEN
      _deadline_days := COALESCE((_assessment_config->>'deadline_days')::int, 7);
    END IF;
    _deadline := now() + (_deadline_days || ' days')::interval;
    _token_expiry := _deadline + interval '7 days';

    INSERT INTO public.candidate_assessments (
      candidate_id,
      assessment_id,
      job_id,
      deadline,
      token_expires_at,
      status,
      assigned_via
    )
    VALUES (
      _candidate_id,
      _default_assessment_id,
      NEW.job_id,
      _deadline,
      _token_expiry,
      'invited',
      'job_default'
    )
    ON CONFLICT (candidate_id, assessment_id) DO UPDATE
    SET
      job_id = EXCLUDED.job_id,
      status = CASE
        WHEN public.candidate_assessments.status = 'expired' THEN 'invited'
        ELSE public.candidate_assessments.status
      END;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para novas candidaturas ou atualizações de candidatura
DROP TRIGGER IF EXISTS trg_auto_enroll_and_assign_assessment ON public.job_applications;
CREATE TRIGGER trg_auto_enroll_and_assign_assessment
AFTER INSERT OR UPDATE OF candidate_id ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_and_assign_assessment_on_application();

-- Trigger auxiliar: caso o candidato seja criado diretamente na tabela candidates com job_id
CREATE OR REPLACE FUNCTION public.auto_enroll_and_assign_assessment_on_candidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _default_assessment_id uuid;
  _assessment_config jsonb;
  _deadline_days int := 7;
  _deadline timestamptz;
  _token_expiry timestamptz;
  _first_stage_id uuid;
  _existing_interview_id uuid;
BEGIN
  IF NEW.job_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Auto-aprovação / matrícula na primeira etapa
  SELECT id INTO _first_stage_id
  FROM public.job_interview_stages
  WHERE job_id = NEW.job_id
  ORDER BY order_index ASC
  LIMIT 1;

  IF _first_stage_id IS NOT NULL THEN
    SELECT id INTO _existing_interview_id
    FROM public.candidate_interviews
    WHERE candidate_id = NEW.id
      AND job_interview_stage_id = _first_stage_id
    LIMIT 1;

    IF _existing_interview_id IS NOT NULL THEN
      UPDATE public.candidate_interviews
      SET
        removed_from_pipeline_at = NULL,
        enrolled_at = now()
      WHERE id = _existing_interview_id;
    ELSE
      INSERT INTO public.candidate_interviews (candidate_id, job_interview_stage_id, enrolled_at)
      VALUES (NEW.id, _first_stage_id, now());
    END IF;
  END IF;

  -- 2. Auto-atribuição de Avaliação
  SELECT default_assessment_id, assessment_config
  INTO _default_assessment_id, _assessment_config
  FROM public.jobs
  WHERE id = NEW.job_id;

  IF _default_assessment_id IS NOT NULL THEN
    IF _assessment_config ? 'deadline_days' THEN
      _deadline_days := COALESCE((_assessment_config->>'deadline_days')::int, 7);
    END IF;
    _deadline := now() + (_deadline_days || ' days')::interval;
    _token_expiry := _deadline + interval '7 days';

    INSERT INTO public.candidate_assessments (
      candidate_id,
      assessment_id,
      job_id,
      deadline,
      token_expires_at,
      status,
      assigned_via
    )
    VALUES (
      NEW.id,
      _default_assessment_id,
      NEW.job_id,
      _deadline,
      _token_expiry,
      'invited',
      'job_default'
    )
    ON CONFLICT (candidate_id, assessment_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enroll_and_assign_assessment_candidate ON public.candidates;
CREATE TRIGGER trg_auto_enroll_and_assign_assessment_candidate
AFTER INSERT OR UPDATE OF job_id ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_and_assign_assessment_on_candidate();

-- Executar retroativamente para candidatos já existentes (como a Juliana Brandão):
DO $$
DECLARE
  r RECORD;
  _first_stage_id uuid;
  _default_assessment_id uuid;
  _deadline timestamptz := now() + interval '7 days';
  _token_expiry timestamptz := now() + interval '14 days';
BEGIN
  FOR r IN (
    SELECT c.id AS candidate_id, c.job_id
    FROM public.candidates c
    WHERE c.job_id IS NOT NULL
  ) LOOP
    -- 1. Matricular na primeira etapa
    SELECT id INTO _first_stage_id
    FROM public.job_interview_stages
    WHERE job_id = r.job_id
    ORDER BY order_index ASC
    LIMIT 1;

    IF _first_stage_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.candidate_interviews
        WHERE candidate_id = r.candidate_id AND job_interview_stage_id = _first_stage_id
      ) THEN
        INSERT INTO public.candidate_interviews (candidate_id, job_interview_stage_id, enrolled_at)
        VALUES (r.candidate_id, _first_stage_id, now());
      END IF;
    END IF;

    -- 2. Atribuir teste
    SELECT default_assessment_id INTO _default_assessment_id
    FROM public.jobs
    WHERE id = r.job_id;

    IF _default_assessment_id IS NOT NULL THEN
      INSERT INTO public.candidate_assessments (
        candidate_id,
        assessment_id,
        job_id,
        deadline,
        token_expires_at,
        status,
        assigned_via
      )
      VALUES (
        r.candidate_id,
        _default_assessment_id,
        r.job_id,
        _deadline,
        _token_expiry,
        'invited',
        'job_default'
      )
      ON CONFLICT (candidate_id, assessment_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
