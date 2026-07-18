/*
# Fix listings RLS policies to avoid recursive RLS

## Problem
The SELECT/INSERT/UPDATE/DELETE policies on `listings` each used an inline
subquery joining `searches`, `clients`, and `agents`. All three of those
tables have RLS enabled, and Postgres applies RLS to subqueries referenced
inside policies. As a result the `EXISTS (...)` check could silently filter
out the owning search/client/agent rows for the current user, causing the
policy to evaluate to false even for the legitimate owner. The visible
symptom was `new row violates row-level security policy for table
"listings"` on INSERT, and a blank client dashboard.

## Fix
Replace the inline ownership subquery in every `listings` policy with the
existing `SECURITY DEFINER` helper `public.user_owns_search(search_id)`.
That helper runs with the owner's privileges and bypasses RLS, so the
ownership check is deterministic and no longer subject to recursive RLS
filtering. The ownership semantics are unchanged: a row is visible/writable
only if the current authenticated user owns the client of the search
(`c.user_id = auth.uid()`) OR owns the agent of the client of the search
(`a.user_id = auth.uid()`).

## Changes
- `select_listings`  — USING  = `user_owns_search(search_id)`
- `insert_listings`  — WITH CHECK = `user_owns_search(search_id)`
- `update_listings`  — USING + WITH CHECK = `user_owns_search(search_id)`
- `delete_listings`  — USING  = `user_owns_search(search_id)`

## Security
- RLS remains enabled on `listings`.
- Policies remain scoped `TO authenticated`.
- Ownership predicate is preserved (client owner OR agent owner).
- No `USING (true)` shortcuts introduced.
*/

DROP POLICY IF EXISTS "select_listings" ON listings;
CREATE POLICY "select_listings" ON listings FOR SELECT
  TO authenticated USING (public.user_owns_search(search_id));

DROP POLICY IF EXISTS "insert_listings" ON listings;
CREATE POLICY "insert_listings" ON listings FOR INSERT
  TO authenticated WITH CHECK (public.user_owns_search(search_id));

DROP POLICY IF EXISTS "update_listings" ON listings;
CREATE POLICY "update_listings" ON listings FOR UPDATE
  TO authenticated
  USING (public.user_owns_search(search_id))
  WITH CHECK (public.user_owns_search(search_id));

DROP POLICY IF EXISTS "delete_listings" ON listings;
CREATE POLICY "delete_listings" ON listings FOR DELETE
  TO authenticated USING (public.user_owns_search(search_id));
