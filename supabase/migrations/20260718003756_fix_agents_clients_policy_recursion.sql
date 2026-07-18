-- Break infinite RLS recursion between agents and clients policies.
-- The agents SELECT policy references clients, and the clients SELECT/UPDATE/INSERT/DELETE
-- policies reference agents, creating a mutual recursion. SECURITY DEFINER functions
-- bypass RLS so the cross-table lookups no longer re-enter the policy cycle.

CREATE OR REPLACE FUNCTION public.is_client_of_agent(p_agent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agent_id = p_agent_id AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agent_of_client(p_agent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = p_agent_id AND a.user_id = auth.uid()
  );
$$;

-- Replace the recursive agents SELECT policy.
DROP POLICY IF EXISTS select_linked_agents ON public.agents;
CREATE POLICY select_linked_agents ON public.agents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_client_of_agent(id));

-- Replace the recursive clients policies.
DROP POLICY IF EXISTS select_clients ON public.clients;
CREATE POLICY select_clients ON public.clients
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_agent_of_client(agent_id));

DROP POLICY IF EXISTS insert_clients ON public.clients;
CREATE POLICY insert_clients ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agent_of_client(agent_id));

DROP POLICY IF EXISTS update_clients ON public.clients;
CREATE POLICY update_clients ON public.clients
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_agent_of_client(agent_id))
  WITH CHECK (public.is_agent_of_client(agent_id));

DROP POLICY IF EXISTS delete_clients ON public.clients;
CREATE POLICY delete_clients ON public.clients
  FOR DELETE TO authenticated
  USING (public.is_agent_of_client(agent_id));