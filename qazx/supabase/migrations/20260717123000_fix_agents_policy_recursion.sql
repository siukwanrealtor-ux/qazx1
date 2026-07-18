DROP POLICY IF EXISTS "select_linked_agents" ON agents;
DROP POLICY IF EXISTS "select_own_agent" ON agents;

CREATE POLICY "select_own_agent" ON agents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
