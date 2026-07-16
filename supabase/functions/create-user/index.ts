import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Body {
  email: string;
  name?: string;
  role: "agent" | "client";
  agentId?: string;
  phone?: string;
  clientName?: string;
  redirectTo?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      email,
      name,
      role,
      agentId,
      phone,
      clientName,
      redirectTo,
    } = (await req.json()) as Body;

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Use the redirectTo from the frontend (the actual deployed app origin).
    // Fall back to the Origin header, then to the Referer header.
    const appOrigin =
      redirectTo ||
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      "";
    const setupRedirect = `${appOrigin}?action=setup`;

    // Admin client for user management
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Regular client (anon key) for sending reset emails — resetPasswordForEmail
    // is a client-side auth method, NOT an admin method.
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Check whether a user already exists with this email.
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    let existingUser: { id: string; email: string } | null = null;
    if (existingUsers?.users) {
      existingUser =
        existingUsers.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail,
        ) ?? null;
    }

    let userId: string;
    let isNew = false;

    if (existingUser) {
      // Account exists — send a password reset email via the anon client
      // (this is the client-side method that actually sends the email).
      userId = existingUser.id;
      const { error: resetError } = await anonClient.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: setupRedirect },
      );
      if (resetError) {
        return new Response(
          JSON.stringify({ error: resetError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      // Create the user via invite — this sends the invite email automatically.
      const { data: invited, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(
          normalizedEmail,
          { redirectTo: setupRedirect, data: { name: name || clientName || "", role } },
        );

      if (inviteError || !invited?.user) {
        return new Response(
          JSON.stringify({ error: inviteError?.message ?? "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      userId = invited.user.id;
      isNew = true;
    }

    // Create the profile row.
    if (role === "agent") {
      const { data: agent } = await adminClient
        .from("agents")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!agent) {
        await adminClient.from("agents").upsert(
          { user_id: userId, email: normalizedEmail, name: name || null },
          { onConflict: "user_id" },
        );
      }
    } else if (role === "client") {
      if (!agentId) {
        return new Response(
          JSON.stringify({ error: "agentId is required for client role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: client } = await adminClient
        .from("clients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!client) {
        await adminClient.from("clients").upsert(
          {
            agent_id: agentId,
            user_id: userId,
            name: clientName || name || "",
            phone: phone || null,
            email: normalizedEmail,
          },
          { onConflict: "user_id" },
        );
      }
    }

    return new Response(
      JSON.stringify({
        userId,
        isNew,
        message: isNew
          ? "Account created. Check your email for a link to set your password."
          : "Account already exists. A password setup link has been emailed.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
