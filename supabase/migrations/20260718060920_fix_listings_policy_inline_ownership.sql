-- Replace function-based listings policies with inline EXISTS ownership checks,
-- matching the original migration file. The SECURITY DEFINER helper
-- user_owns_search() can fail to resolve auth.uid() reliably inside RLS
-- policy evaluation under PostgREST, causing spurious 42501 errors.

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
