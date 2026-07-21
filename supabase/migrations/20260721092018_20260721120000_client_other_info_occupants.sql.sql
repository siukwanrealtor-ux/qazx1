/*
# Add "Other Information", "Occupants", and "Adults" fields to clients

1. Purpose
- Adds a shared "Other Information" free-text field available to BOTH buyer
  and renter client types, so agents/clients can capture notes that do not
  fit into the structured criteria (e.g. accessibility needs, preferred
  view, HOA requirements).
- Adds renter-only "Occupants" (total number of people who will live in the
  rental) and "Adults" (how many of those occupants are adults) fields, used
  by agents to match rental occupancy rules.

2. New Columns (all on public.clients)
- other_information  text         nullable  — free-text notes for any client type
- occupants          integer      nullable  — total occupants (renter only)
- adults             integer      nullable  — number of adult occupants (renter only)

3. Security
- No changes to RLS. The existing clients SELECT/INSERT/UPDATE/DELETE policies
  already scope access to the owning client (user_id = auth.uid()) or their
  agent (is_agent_of_client), and the new columns inherit that protection.
- No new grants: authenticated role already has column-level access to the
  clients table, and ALTER TABLE ... ADD COLUMN does not require re-granting.

4. Data Safety
- All new columns are nullable and have no NOT NULL constraint, so existing
  rows are unaffected.
- No columns are dropped, renamed, or retyped.

5. Idempotency
- Column additions are guarded by IF NOT EXISTS checks via a DO block, so the
  migration is safe to re-apply.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'other_information'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN other_information text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'occupants'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN occupants integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'adults'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN adults integer;
  END IF;
END $$;