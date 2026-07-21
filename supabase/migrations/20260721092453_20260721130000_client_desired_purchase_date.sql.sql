/*
# Add "Desired Purchase Date" field for buyer clients

1. Purpose
- Adds a date field specific to buyer search type so a client/agent can record
  when the buyer hopes to complete their purchase. This is distinct from the
  existing renter-only "desired_move_in_date" and is only populated for
  buyers.

2. New Columns (on public.clients)
- desired_purchase_date  date  nullable  — target purchase date for buyers

3. Security
- No changes to RLS. The existing clients SELECT/INSERT/UPDATE/DELETE policies
  already scope access to the owning client (user_id = auth.uid()) or their
  agent (is_agent_of_client), and the new column inherits that protection.

4. Data Safety
- New column is nullable; existing rows are unaffected.
- No columns are dropped, renamed, or retyped.

5. Idempotency
- Column addition is guarded by IF NOT EXISTS via a DO block, so the
  migration is safe to re-apply.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'desired_purchase_date'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN desired_purchase_date date;
  END IF;
END $$;