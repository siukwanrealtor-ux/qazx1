/*
# Fix searches RLS policies to avoid recursive RLS

## Problem
The SELECT/INSERT/UPDATE/DELETE policies on `searches` each used an inline
subquery against `clients`:
    EXISTS (SELECT 1 FROM clients c
            WHERE c.id = searches.client_id
              AND (c.user_id = auth.uid() OR is_agent_of_client(c.agent_id)))
`clients` has RLS enabled, and Postgres applies RLS to subqueries referenced
inside policies. The `c.user_id = auth.uid()` branch therefore only sees
`clients` rows the current user can already SELECT — which for the client
owner works, but the net effect is fragile and mirrors the exact bug that
broke `listings` inserts. Symptom: a client owner (or their agent) could be
denied visibility/writes on their own searches depending on the `clients`
SELECT policy shape, producing a blank client dashboard or
`new row violates row-level security policy` errors.

## Fix
1. Add a new `SECURITY DEFINER` helper `public.user_owns_client(p_client_id)`
   that checks ownership the same way `user_owns_search` does: the current
   user is either the client's `user_id` OR the agent of that client. It runs
   with the owner's privileges and bypasses RLS, so the check is deterministic.
2. Rewrite all four `searches` policies to call `user_owns_client(client_id)`
   instead of the inline `clients` subquery.

## Ownership semantics (unchanged)
A `searches` row is visible/writable only if the current authenticated user
owns the associated client (`c.user_id = auth.uid()`) OR owns the agent of
that client (`a.user_id = auth.uid()` via `is_agent_of_client`).

## Changes
- New function: `public.user_owns_client(p_client_id uuid) RETURNS boolean`
  SECURITY DEFINER, search_path = 'public'.
- `select_searches`  — USING      = `user_owns_client(client_id)`
- `insert_searches`  — WITH CHECK = `user_owns_client(client_id)`
- `update_searches`  — USING + WITH CHECK = `user_owns_client(client_id)`
- `delete_searches`  — USING      = `user_owns_client(client_id)`

## Security
- RLS remains enabled on `searches`.
- Policies remain scoped `TO authenticated`.
- Ownership predicate is preserved (client owner OR agent owner).
- No `USING (true)` shortcuts introduced.
*/

CREATE OR REPLACE FUNCTION public.user_owns_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1
  FROM public.clients c
  WHERE c.id = p_client_id
  AND (
    c.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = c.agent_id AND a.user_id = auth.uid()
    )
  )
);
$function$;

DROP POLICY IF EXISTS "select_searches" ON searches;
CREATE POLICY "select_searches" ON searches FOR SELECT
  TO authenticated USING (public.user_owns_client(client_id));

DROP POLICY IF EXISTS "insert_searches" ON searches;
CREATE POLICY "insert_searches" ON searches FOR INSERT
  TO authenticated WITH CHECK (public.user_owns_client(client_id));

DROP POLICY IF EXISTS "update_searches" ON searches;
CREATE POLICY "update_searches" ON searches FOR UPDATE
  TO authenticated
  USING (public.user_owns_client(client_id))
  WITH CHECK (public.user_owns_client(client_id));

DROP POLICY IF EXISTS "delete_searches" ON searches;
CREATE POLICY "delete_searches" ON searches FOR DELETE
  TO authenticated USING (public.user_owns_client(client_id));
