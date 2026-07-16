/*
# Real Estate Agent Management Platform — Core Schema

## Purpose
A multi-agent real estate platform where agents manage clients, and each client
can have multiple saved searches, each containing property listings.

## New Tables

1. `agents` — one row per real-estate agent (linked to auth.users)
   - `id` uuid pk
   - `user_id` uuid unique NOT NULL, references auth.users, defaults to auth.uid()
   - `name` text (display name, optional at invite, set on password setup)
   - `email` text unique NOT NULL
   - `created_at` timestamptz default now()

2. `clients` — a client managed by exactly one agent
   - `id` uuid pk
   - `agent_id` uuid NOT NULL references agents(id) ON DELETE CASCADE
   - `user_id` uuid unique references auth.users(id) ON DELETE SET NULL
     (null until the client accepts their invite and sets a password)
   - `name` text NOT NULL
   - `phone` text
   - `email` text NOT NULL
   - `created_at` timestamptz default now()

3. `searches` — a saved search belonging to a client (agent can add many per client)
   - `id` uuid pk
   - `client_id` uuid NOT NULL references clients(id) ON DELETE CASCADE
   - `name` text NOT NULL default 'New Search'
   - `created_at` timestamptz default now()

4. `listings` — a property listing inside a search
   - `id` uuid pk
   - `search_id` uuid NOT NULL references searches(id) ON DELETE CASCADE
   - `photo_url` text
   - `address` text
   - `price` numeric(14,2)
   - `beds` int
   - `baths` numeric(3,1)
   - `sqft` int
   - `lot_size` text
   - `listing_status` text default 'Active'
   - `last_updated` date
   - `customer_status` text default 'New Lead'
   - `notes` text
   - `created_at` timestamptz default now()

## Security (RLS)
- RLS enabled on every table.
- `agents`: owner-scoped CRUD (user_id = auth.uid()).
- `clients`: agent owns (via agents.user_id) OR the client themselves (user_id = auth.uid()).
- `searches` / `listings`: accessible to the owning agent (via client -> agent)
  OR the client themselves. Both agent and client can INSERT/UPDATE/DELETE.
- All policies use auth.uid(); no TO anon (this is a signed-in app).

## Notes
- Owner columns default to auth.uid() so frontend inserts that omit the owner
  still satisfy WITH CHECK policies.
- Child-table policies use EXISTS subqueries against the parent ownership chain.
*/

-- ===== agents =====
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_agent" ON agents;
CREATE POLICY "select_own_agent" ON agents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_agent" ON agents;
CREATE POLICY "insert_own_agent" ON agents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_agent" ON agents;
CREATE POLICY "update_own_agent" ON agents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_agent" ON agents;
CREATE POLICY "delete_own_agent" ON agents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== clients =====
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS clients_agent_id_idx ON clients(agent_id);
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
CREATE INDEX IF NOT EXISTS clients_email_idx ON clients(email);

DROP POLICY IF EXISTS "select_clients" ON clients;
CREATE POLICY "select_clients" ON clients FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agents a WHERE a.id = clients.agent_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_clients" ON clients;
CREATE POLICY "insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a WHERE a.id = clients.agent_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_clients" ON clients;
CREATE POLICY "update_clients" ON clients FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM agents a WHERE a.id = clients.agent_id AND a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = clients.agent_id AND a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_clients" ON clients;
CREATE POLICY "delete_clients" ON clients FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agents a WHERE a.id = clients.agent_id AND a.user_id = auth.uid())
  );

-- ===== searches =====
CREATE TABLE IF NOT EXISTS searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'New Search',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS searches_client_id_idx ON searches(client_id);

DROP POLICY IF EXISTS "select_searches" ON searches;
CREATE POLICY "select_searches" ON searches FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN agents a ON a.id = c.agent_id
      WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_searches" ON searches;
CREATE POLICY "insert_searches" ON searches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN agents a ON a.id = c.agent_id
      WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_searches" ON searches;
CREATE POLICY "update_searches" ON searches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN agents a ON a.id = c.agent_id
      WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN agents a ON a.id = c.agent_id
      WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_searches" ON searches;
CREATE POLICY "delete_searches" ON searches FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN agents a ON a.id = c.agent_id
      WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

-- ===== listings =====
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
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
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS listings_search_id_idx ON listings(search_id);

DROP POLICY IF EXISTS "select_listings" ON listings;
CREATE POLICY "select_listings" ON listings FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN clients c ON c.id = s.client_id
      JOIN agents a ON a.id = c.agent_id
      WHERE s.id = listings.search_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_listings" ON listings;
CREATE POLICY "insert_listings" ON listings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN clients c ON c.id = s.client_id
      JOIN agents a ON a.id = c.agent_id
      WHERE s.id = listings.search_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_listings" ON listings;
CREATE POLICY "update_listings" ON listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN clients c ON c.id = s.client_id
      JOIN agents a ON a.id = c.agent_id
      WHERE s.id = listings.search_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN clients c ON c.id = s.client_id
      JOIN agents a ON a.id = c.agent_id
      WHERE s.id = listings.search_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_listings" ON listings;
CREATE POLICY "delete_listings" ON listings FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN clients c ON c.id = s.client_id
      JOIN agents a ON a.id = c.agent_id
      WHERE s.id = listings.search_id
      AND (c.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );
