/*
# Revoke anon table privileges on authenticated-only tables

## Context
The tables `agents`, `clients`, `searches`, and `listings` all have RLS
enabled with policies scoped `TO authenticated` only (every policy uses
`auth.uid()`-based ownership checks). Despite that, each table still had
the default broad `anon` grants (SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
REFERENCES, TRIGGER) inherited from the schema's default privileges.

Because every policy on these tables requires an authenticated session
(`auth.uid()` is NULL for anon), the anon grants were dead weight — anon
could never satisfy any policy and would always see zero rows / be denied
writes. A security scanner also reported "permission denied to analyze
listings" because the anon permission story on that table was
inconsistent with its authenticated-only policies.

## Changes
1. Revoke all privileges from the `anon` role on `agents`, `clients`,
   `searches`, and `listings`.
2. Re-grant the standard CRUD privileges (SELECT, INSERT, UPDATE,
   DELETE) to `authenticated` on all four tables so signed-in users can
   use them through RLS. (TRUNCATE, REFERENCES, TRIGGER are intentionally
   NOT re-granted — they are not needed for app operation.)

## Security
- Removes unnecessary anon access to authenticated-only tables.
- Tightens the principle of least privilege: anon can no longer even
  attempt SELECT/INSERT/UPDATE/DELETE on these tables.
- No behavior change for authenticated users — they retain the same CRUD
  privileges, still gated by the existing RLS policies.

## Notes
1. Idempotent: `REVOKE` is a no-op if the privilege is already absent;
   `GRANT` is a no-op if already present.
2. The `service_role` and `postgres` grants are untouched — they bypass
   RLS by design and are required for administration and edge functions
   using the service role key.
*/

REVOKE ALL PRIVILEGES ON TABLE public.agents FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.clients FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.searches FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.listings FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.searches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listings TO authenticated;
