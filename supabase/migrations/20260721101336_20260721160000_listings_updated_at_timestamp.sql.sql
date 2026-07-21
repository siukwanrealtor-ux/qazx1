/*
# Add auto-updating updated_at timestamp to listings

## Why
The `listings.last_updated` column is a `date` (day granularity, no time). When a
listing is edited twice on the same day, both writes store the identical date, so
the "last updated" value displayed in the UI never appears to change and the
"sort by last update desc" ordering cannot distinguish same-day edits.

## Changes
1. Modified table: `listings`
   - New column `updated_at timestamptz NOT NULL DEFAULT now()`.
   - Backfill every existing row from the legacy `last_updated` (cast to
     timestamptz at midnight), falling back to `created_at` when `last_updated`
     is null, so historical sort order is preserved.
2. Automation
   - `BEFORE UPDATE` trigger `set_listings_updated_at` sets `updated_at = now()`
     on every row update, reusing the existing `public.set_updated_at()` function
     already used by `agents`. The timestamp now updates automatically whenever a
     listing is edited — no client-side bookkeeping required.

## Notes
- `last_updated` (the legacy `date` column) is left in place to avoid a
  destructive column change. The frontend is migrated to read `updated_at`
  instead; `last_updated` is no longer written by the app.
- Idempotent: uses IF NOT EXISTS / DROP IF EXISTS so it is safe to re-apply.
*/

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE listings
SET updated_at = COALESCE(last_updated::timestamptz, created_at);

DROP TRIGGER IF EXISTS set_listings_updated_at ON listings;
CREATE TRIGGER set_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();