import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Agent, Client } from "./types";

interface AuthState {
  session: Session | null;
  user: User | null;
  agent: Agent | null;
  client: Client | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshAgent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    agent: null,
    client: null,
    loading: true,
  });

  const loadAgent = async (userId: string): Promise<Agent | null> => {
    const { data } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data as Agent | null;
  };

  const loadClient = async (userId: string): Promise<Client | null> => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data as Client | null;
  };

  const refreshAgent = async () => {
    if (!state.user) return;
    const agent = await loadAgent(state.user.id);
    setState((s) => ({ ...s, agent }));
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const session = data.session;
      let agent: Agent | null = null;
      let client: Client | null = null;
      if (session?.user) {
        agent = await loadAgent(session.user.id);
        if (!agent) client = await loadClient(session.user.id);
      }
      if (mounted)
        setState({
          session,
          user: session?.user ?? null,
          agent,
          client,
          loading: false,
        });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        let agent: Agent | null = null;
        let client: Client | null = null;
        if (session?.user) {
          agent = await loadAgent(session.user.id);
          if (!agent) client = await loadClient(session.user.id);
        }
        if (!mounted) return;
        setState({
          session,
          user: session?.user ?? null,
          agent,
          client,
          loading: false,
        });
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      session: null,
      user: null,
      agent: null,
      client: null,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshAgent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
