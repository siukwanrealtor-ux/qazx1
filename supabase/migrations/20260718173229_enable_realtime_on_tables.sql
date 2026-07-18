-- Enable Supabase Realtime on all public tables so the frontend
-- .channel()/.on('postgres_changes', ...) subscriptions work.
-- The supabase_realtime publication existed but had zero tables
-- registered, causing "relation realtime.subscription does not exist"
-- errors on the client side.

ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.searches;
