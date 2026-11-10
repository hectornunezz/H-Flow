ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_beta_tester boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_beta_tester IS
  'Closed-beta access flag. Promotion is reserved for an administrator.';

CREATE OR REPLACE FUNCTION public.prevent_self_service_beta_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.is_beta_tester := OLD.is_beta_tester;
  ELSE
    NEW.is_beta_tester := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_service_beta_promotion ON public.profiles;
CREATE TRIGGER prevent_self_service_beta_promotion
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_service_beta_promotion();
