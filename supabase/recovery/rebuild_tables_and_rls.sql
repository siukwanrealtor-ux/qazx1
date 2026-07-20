-- RealtyDash database recovery script
-- Recreates tables, helper functions, triggers, RLS policies,
-- storage buckets/policies, and realtime publication bindings.

BEGIN;

-- Ensure UUID generator is available for gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Functions
-- =========================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- =========================
-- Tables
-- =========================

CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text UNIQUE NOT NULL,
  agent_photo_url text,
  agent_phone_number text,
  agent_license_number text,
  broker_name text,
  broker_license_number text,
  office_address text,
  about_me text,
  personal_website text,
  company_logo_url text,
  email_signature_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text NOT NULL,
  client_type text CHECK (client_type IN ('buyer', 'renter')),
  client_status text,
  purchase_price numeric(14,2),
  rent_budget numeric(14,2),
  desired_move_in_date date,
  preferred_locations text,
  bedrooms numeric(4,1),
  bathrooms numeric(4,1),
  min_sqft int,
  school_district text,
  pre_approved boolean,
  pet_friendly boolean,
  household_income numeric(14,2),
  credit_score int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'New Search',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  photo_url text,
  address text,
  price numeric(14,2),
  beds int,
  baths numeric(3,1),
  sqft int,
  lot_size text,
  listing_status text NOT NULL DEFAULT 'Active',
  last_updated date,
  customer_status text NOT NULL DEFAULT 'New Lead',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill expected default client type where null.
UPDATE public.clients
SET client_type = 'buyer'
WHERE client_type IS NULL;

-- =========================
-- Indexes
-- =========================

CREATE INDEX IF NOT EXISTS clients_agent_id_idx ON public.clients(agent_id);
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS clients_email_idx ON public.clients(email);
CREATE INDEX IF NOT EXISTS searches_client_id_idx ON public.searches(client_id);
CREATE INDEX IF NOT EXISTS listings_search_id_idx ON public.listings(search_id);

-- =========================
-- Trigger
-- =========================

DROP TRIGGER IF EXISTS set_agents_updated_at ON public.agents;
CREATE TRIGGER set_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Ownership helper functions
-- =========================

CREATE OR REPLACE FUNCTION public.is_client_of_agent(p_agent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.agent_id = p_agent_id
      AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agent_of_client(p_agent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agents a
    WHERE a.id = p_agent_id
      AND a.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = p_client_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.agents a
          WHERE a.id = c.agent_id
            AND a.user_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_search(p_search_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.searches s
    JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = p_search_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.agents a
          WHERE a.id = c.agent_id
            AND a.user_id = auth.uid()
        )
      )
  );
$$;

-- =========================
-- Row Level Security
-- =========================

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- agents
DROP POLICY IF EXISTS select_linked_agents ON public.agents;
DROP POLICY IF EXISTS select_own_agent ON public.agents;
DROP POLICY IF EXISTS insert_own_agent ON public.agents;
DROP POLICY IF EXISTS update_own_agent ON public.agents;
DROP POLICY IF EXISTS delete_own_agent ON public.agents;

CREATE POLICY select_linked_agents
ON public.agents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_client_of_agent(id));

CREATE POLICY insert_own_agent
ON public.agents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_agent
ON public.agents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_agent
ON public.agents
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- clients
DROP POLICY IF EXISTS select_clients ON public.clients;
DROP POLICY IF EXISTS insert_clients ON public.clients;
DROP POLICY IF EXISTS update_clients ON public.clients;
DROP POLICY IF EXISTS delete_clients ON public.clients;

CREATE POLICY select_clients
ON public.clients
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_agent_of_client(agent_id));

CREATE POLICY insert_clients
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.is_agent_of_client(agent_id));

CREATE POLICY update_clients
ON public.clients
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_agent_of_client(agent_id))
WITH CHECK (public.is_agent_of_client(agent_id));

CREATE POLICY delete_clients
ON public.clients
FOR DELETE
TO authenticated
USING (public.is_agent_of_client(agent_id));

-- searches
DROP POLICY IF EXISTS select_searches ON public.searches;
DROP POLICY IF EXISTS insert_searches ON public.searches;
DROP POLICY IF EXISTS update_searches ON public.searches;
DROP POLICY IF EXISTS delete_searches ON public.searches;

CREATE POLICY select_searches
ON public.searches
FOR SELECT
TO authenticated
USING (public.user_owns_client(client_id));

CREATE POLICY insert_searches
ON public.searches
FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_client(client_id));

CREATE POLICY update_searches
ON public.searches
FOR UPDATE
TO authenticated
USING (public.user_owns_client(client_id))
WITH CHECK (public.user_owns_client(client_id));

CREATE POLICY delete_searches
ON public.searches
FOR DELETE
TO authenticated
USING (public.user_owns_client(client_id));

-- listings
DROP POLICY IF EXISTS select_listings ON public.listings;
DROP POLICY IF EXISTS insert_listings ON public.listings;
DROP POLICY IF EXISTS update_listings ON public.listings;
DROP POLICY IF EXISTS delete_listings ON public.listings;

CREATE POLICY select_listings
ON public.listings
FOR SELECT
TO authenticated
USING (public.user_owns_search(search_id));

CREATE POLICY insert_listings
ON public.listings
FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_search(search_id));

CREATE POLICY update_listings
ON public.listings
FOR UPDATE
TO authenticated
USING (public.user_owns_search(search_id))
WITH CHECK (public.user_owns_search(search_id));

CREATE POLICY delete_listings
ON public.listings
FOR DELETE
TO authenticated
USING (public.user_owns_search(search_id));

-- =========================
-- Storage buckets + policies
-- =========================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'agent-profile-photos',
    'agent-profile-photos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'agent-company-logos',
    'agent-company-logos',
    false,
    3145728,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
  ),
  (
    'agent-email-signatures',
    'agent-email-signatures',
    false,
    3145728,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS profile_photo_upload_own ON storage.objects;
CREATE POLICY profile_photo_upload_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS profile_photo_update_own ON storage.objects;
CREATE POLICY profile_photo_update_own
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS profile_photo_delete_own ON storage.objects;
CREATE POLICY profile_photo_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS company_logo_upload_own ON storage.objects;
CREATE POLICY company_logo_upload_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS company_logo_update_own ON storage.objects;
CREATE POLICY company_logo_update_own
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS company_logo_delete_own ON storage.objects;
CREATE POLICY company_logo_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS signature_upload_own ON storage.objects;
CREATE POLICY signature_upload_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS signature_update_own ON storage.objects;
CREATE POLICY signature_update_own
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS signature_delete_own ON storage.objects;
CREATE POLICY signature_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================
-- Realtime publication
-- =========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'searches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.searches;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'listings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
  END IF;
END
$$;

COMMIT;
