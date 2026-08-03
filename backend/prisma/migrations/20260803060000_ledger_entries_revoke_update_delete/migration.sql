-- ledger_entries est append-only au niveau des privilèges SQL.
-- Rôle applicatif : INSERT + SELECT uniquement.
-- Toute correction = écriture compensatoire (nouvelle ligne), jamais UPDATE/DELETE.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'donypay_app') THEN
    CREATE ROLE donypay_app
      NOINHERIT
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO donypay_app;

-- Retire tout accès implicite
REVOKE ALL ON TABLE public.ledger_entries FROM PUBLIC;
REVOKE ALL ON TABLE public.ledger_entries FROM donypay_app;

-- Révoque UPDATE/DELETE pour les rôles connus (local + Supabase)
DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY[
    'donypay',
    'anon',
    'authenticated',
    'service_role',
    'authenticator'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE UPDATE, DELETE ON TABLE public.ledger_entries FROM %I',
        role_name
      );
      EXECUTE format(
        'GRANT SELECT, INSERT ON TABLE public.ledger_entries TO %I',
        role_name
      );
    END IF;
  END LOOP;
END
$$;

-- Contrat applicatif explicite
GRANT SELECT, INSERT ON TABLE public.ledger_entries TO donypay_app;
REVOKE UPDATE, DELETE ON TABLE public.ledger_entries FROM donypay_app;

COMMENT ON TABLE public.ledger_entries IS
  'Append-only ledger. Privileges applicatifs: SELECT/INSERT only. Corrections via écritures compensatoires, jamais UPDATE/DELETE.';
