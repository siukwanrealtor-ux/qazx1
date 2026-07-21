/*
# Add source URL field to listings

1. Purpose
- Adds a "source URL" field to each listing so an agent/client can link the
  listing back to its original source on Zillow.com, Realtor.com, or a
  similar site. A "View listing" button on the listing card opens this URL
  in a new browser tab.

2. New Columns (on public.listings)
- source_url  text  nullable  — link to the listing's source page
  (e.g. https://www.zillow.com/...). Optional; the card only shows the
  "View listing" button when this is populated.

3. Security
- No changes to RLS. The existing listings policies scope access to the
  owning client/agent via the parent search/client chain, and the new
  column inherits that protection automatically.

4. Data Safety
- New nullable column; existing rows are unaffected.
- No columns are dropped, renamed, or retyped.

5. Idempotency
- Column addition is guarded by a DO block so the migration is safe to
  re-apply.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN source_url text;
  END IF;
END $$;