/*
# Revoke explicit anon EXECUTE on SECURITY DEFINER helper functions

## Context
Follow-up to `revoke_execute_helper_functions`. After revoking EXECUTE
from PUBLIC, an explicit `anon=X/postgres` ACL entry remained on all four
helper functions (`is_agent_of_client`, `is_client_of_agent`,
`user_owns_client`, `user_owns_search`), so the `anon` role could still
invoke them via `/rest/v1/rpc/<name>`. This migration removes that
explicit grant.

## Changes
1. Revoke `EXECUTE` from the `anon` role explicitly on all four
   functions.
2. Re-grant `EXECUTE` to `authenticated` (idempotent safeguard) so RLS
   policies that call these functions continue to work for signed-in
   users.

## Security
- Completes the fix for "Public Can Execute SECURITY DEFINER Function" —
  `anon` no longer has EXECUTE on any of the four functions, neither via
  PUBLIC nor via an explicit grant.
- `authenticated` retains EXECUTE because RLS policies on `agents`,
  `clients`, `searches`, and `listings` invoke these functions; removing
  it would break access control. The functions only return ownership
  booleans, so exposing them to authenticated users carries no additional
  data-exposure risk.

## Notes
1. Idempotent: `REVOKE` is a no-op if the privilege is already absent.
*/

REVOKE EXECUTE ON FUNCTION public.is_agent_of_client(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_client_of_agent(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_client(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_search(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.is_agent_of_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_of_agent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_search(uuid) TO authenticated;
