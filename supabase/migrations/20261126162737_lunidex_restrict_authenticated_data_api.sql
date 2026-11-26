-- Temporary single-account access is enforced by the Next.js server using
-- SUPABASE_ALLOWED_USER_ID and verified Auth email. PostgREST's authenticated
-- role cannot consume that runtime-only environment variable, so close its
-- direct access to app schemas while retaining intentional anon projections.
-- This migration changes grants only; it does not read, delete, or rewrite rows.

begin;

-- Remove PostgreSQL's default PUBLIC schema access and regrant only the
-- intentional anonymous projection role. The postgres owner/superuser keeps
-- server-side access; authenticated receives no direct PostgREST usage.
revoke usage on schema public from public;
grant usage on schema public to anon;
revoke all on schema public, app, analytics from authenticated;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;
revoke execute on all functions in schema public from authenticated;
revoke execute on all functions in schema app from authenticated;
revoke execute on all functions in schema analytics from authenticated;

-- Keep newly created objects closed to the PostgREST authenticated role too.
alter default privileges in schema public
  revoke all on tables from authenticated;
alter default privileges in schema public
  revoke all on sequences from authenticated;
alter default privileges in schema public
  revoke execute on functions from authenticated;
alter default privileges in schema app
  revoke all on tables from authenticated;
alter default privileges in schema app
  revoke all on sequences from authenticated;
alter default privileges in schema app
  revoke execute on functions from authenticated;
alter default privileges in schema analytics
  revoke all on tables from authenticated;
alter default privileges in schema analytics
  revoke all on sequences from authenticated;
alter default privileges in schema analytics
  revoke execute on functions from authenticated;

commit;
