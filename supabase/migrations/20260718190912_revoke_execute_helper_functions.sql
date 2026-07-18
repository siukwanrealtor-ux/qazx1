/*
# Lock down SECURITY DEFINER helper functions from anon access

## Context
Four helper functions (`is_agent_of_client`, `is_client_of_agent`,
`user_owns_client`, `user_owns_search`) are `SECURITY DEFINER` and were
executable by the `anon` role via the PostgREST RPC endpoint
(`/rest/v1/rpc/<name>`). A security scan flagged this as a risk because
`SECURITY DEFINER` functions bypass row-level security.

These functions MUST remain `SECURITY DEFINER`: they are called from RLS
policies on `agents`, `clients`, `searches`, and `listings`. The `agents`
SELECT policy references `is_client_of_agent` (which queries `clients`),
and the `clients` SELECT policy references `is_agent_of_client` (which
queries `agents`). If the functions ran as `SECURITY INVOKER`, evaluating
those policies would recurse infinitely. `SECURITY DEFINER` is the
intentional fix for that recursion.

## Changes
1. Revoke the default `EXECUTE` grant from `PUBLIC` on all four functions.
   This removes direct execution by the `anon` role via the RPC endpoint.
2. Re-grant `EXECUTE` to the `authenticated` role only. RLS policy
   expressions are evaluated as the current user, so authenticated users
   must retain `EXECUTE` for the policies that call these functions to
   work. The functions only return ownership booleans that the caller can
   already infer through the protected tables themselves, so exposing them
   to authenticated users carries no additional data-exposure risk.

## Security
- Fixes "Public Can Execute SECURITY DEFINER Function" for all four
  functions (anon can no longer call them).
- The "Signed-In Users Can Execute" findings are intentional and retained:
  the functions are required by authenticated-scoped RLS policies and
  cannot be switched to `SECURITY INVOKER` without breaking access
  control via infinite recursion.

## Notes
1. The functions themselves are not modified — only their `EXECUTE`
   privileges.
2. Re-running this migration is safe: `REVOKE` and `GRANT` are idempotent.
*/

REVOKE EXECUTE ON FUNCTION public.is_agent_of_client(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_client_of_agent(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_client(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_search(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_agent_of_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_of_agent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_search(uuid) TO authenticated;
