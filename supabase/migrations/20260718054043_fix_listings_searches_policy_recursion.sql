-- Break RLS recursion on listings and searches by using SECURITY DEFINER helpers
-- that bypass RLS instead of re-entering the policy cycle via subqueries.

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
      AND (c.user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.agents a WHERE a.id = c.agent_id AND a.user_id = auth.uid()))
  );
$$;

-- listings: rewrite all policies to use the helper.
DROP POLICY IF EXISTS select_listings ON public.listings;
CREATE POLICY select_listings ON public.listings
  FOR SELECT TO authenticated
  USING (public.user_owns_search(search_id));

DROP POLICY IF EXISTS insert_listings ON public.listings;
CREATE POLICY insert_listings ON public.listings
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_search(search_id));

DROP POLICY IF EXISTS update_listings ON public.listings;
CREATE POLICY update_listings ON public.listings
  FOR UPDATE TO authenticated
  USING (public.user_owns_search(search_id))
  WITH CHECK (public.user_owns_search(search_id));

DROP POLICY IF EXISTS delete_listings ON public.listings;
CREATE POLICY delete_listings ON public.listings
  FOR DELETE TO authenticated
  USING (public.user_owns_search(search_id));

-- searches: rewrite to use the existing is_agent_of_client helper instead of a subquery on agents.
DROP POLICY IF EXISTS select_searches ON public.searches;
CREATE POLICY select_searches ON public.searches
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR public.is_agent_of_client(c.agent_id))
  ));

DROP POLICY IF EXISTS insert_searches ON public.searches;
CREATE POLICY insert_searches ON public.searches
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR public.is_agent_of_client(c.agent_id))
  ));

DROP POLICY IF EXISTS update_searches ON public.searches;
CREATE POLICY update_searches ON public.searches
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR public.is_agent_of_client(c.agent_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR public.is_agent_of_client(c.agent_id))
  ));

DROP POLICY IF EXISTS delete_searches ON public.searches;
CREATE POLICY delete_searches ON public.searches
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = searches.client_id
      AND (c.user_id = auth.uid() OR public.is_agent_of_client(c.agent_id))
  ));