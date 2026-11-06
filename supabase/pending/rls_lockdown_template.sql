-- RLS LOCKDOWN. DO NOT APPLY until the browser-side anon usage is removed
-- (counselor login moved to a server route; every browser createClient() read/write replaced
-- by an API route). Service-role calls bypass RLS, so server routes keep working.
-- Step 1 (read-only): list tables with RLS off
--   SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity ORDER BY 1;
-- Step 2: run the block below on a Supabase BRANCH first, then test login and each role.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', r.relname);
  END LOOP;
END $$;

-- Stop future tables defaulting to anon access
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';

-- Step 3: separately review policies with USING (true) on chat/notification tables:
--   SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname='public' AND qual='true';
