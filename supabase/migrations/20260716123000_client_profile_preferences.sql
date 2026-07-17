ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type text CHECK (client_type IN ('buyer', 'renter')),
  ADD COLUMN IF NOT EXISTS client_status text,
  ADD COLUMN IF NOT EXISTS purchase_price numeric(14,2),
  ADD COLUMN IF NOT EXISTS rent_budget numeric(14,2),
  ADD COLUMN IF NOT EXISTS desired_move_in_date date,
  ADD COLUMN IF NOT EXISTS preferred_locations text,
  ADD COLUMN IF NOT EXISTS bedrooms numeric(4,1),
  ADD COLUMN IF NOT EXISTS bathrooms numeric(4,1),
  ADD COLUMN IF NOT EXISTS min_sqft int,
  ADD COLUMN IF NOT EXISTS school_district text,
  ADD COLUMN IF NOT EXISTS pre_approved boolean,
  ADD COLUMN IF NOT EXISTS pet_friendly boolean,
  ADD COLUMN IF NOT EXISTS household_income numeric(14,2),
  ADD COLUMN IF NOT EXISTS credit_score int;

UPDATE clients
SET client_type = 'buyer'
WHERE client_type IS NULL;
