/*
# Allow clients to update their own profile row

1. Purpose
- Fixes "new row violates row-level security policy for table clients" that
  occurs when a CLIENT saves their own profile from the Client Profile page.
- The existing update_clients policy allowed a client to FIND their row via
  USING (user_id = auth.uid() OR is_agent_of_client(agent_id)), but the
  WITH CHECK only permitted the agent (is_agent_of_client(agent_id)). The
  WITH CHECK is evaluated against the new row after the update, so a client
  editing their own profile was rejected even though they owned the row.
- This change makes WITH CHECK match USING, so BOTH the owning client and
  their agent can update the row. The Client Profile UI never sends
  agent_id in the update payload, so clients cannot reassign themselves to
  a different agent through the app.

2. Security Changes
- Drops and recreates the "update_clients" policy on public.clients.
- New policy:
    UPDATE TO authenticated
    USING  (user_id = auth.uid() OR is_agent_of_client(agent_id))
    WITH CHECK (user_id = auth.uid() OR is_agent_of_agent(agent_id))
- No other policies (SELECT/INSERT/DELETE) are touched. INSERT remains
  agent-only (WITH CHECK is_agent_of_client); clients are still created by
  the agent via the create-user edge function (service role, bypasses RLS).

3. Data Safety
- No schema changes, no data changes. Only one RLS policy is replaced.

4. Idempotency
- DROP POLICY IF EXISTS before CREATE, so the migration is safe to re-apply.
*/

DROP POLICY IF EXISTS "update_clients" ON public.clients;

CREATE POLICY "update_clients"
ON public.clients FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_agent_of_client(agent_id))
WITH CHECK (user_id = auth.uid() OR is_agent_of_client(agent_id));