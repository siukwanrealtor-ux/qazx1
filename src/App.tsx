import { useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { useRouter } from "./lib/router";
import Home from "./pages/Home";
import SetupPassword from "./pages/SetupPassword";
import AgentDashboard from "./pages/AgentDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import AgentProfile from "./pages/AgentProfile";
import ClientProfile from "./pages/ClientProfile";
import LegalPage from "./pages/LegalPage";
import { Loader2 } from "lucide-react";

function Router() {
  const { route, navigate } = useRouter();
  const { session, agent, loading } = useAuth();

  // Detect the password-setup flow: Supabase redirects back to
  // ?action=setup with auth tokens in the URL hash (#access_token=...).
  const isSetupFlow =
    route.search.get("action") === "setup" ||
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("type=invite");

  // Route guard: protected routes require a session.
  useEffect(() => {
    if (loading) return;
    if (isSetupFlow) return; // Don't redirect during setup flow

    const isProtected =
      route.path === "/agent/dashboard" ||
      route.path === "/agent/profile" ||
      route.path.startsWith("/client/");

    if (isProtected && !session) {
      navigate("/");
    }

    // If logged in and on home, send to dashboard.
    if (session && route.path === "/") {
      if (agent) navigate("/agent/dashboard");
    }
  }, [route, session, agent, loading, navigate, isSetupFlow]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // Setup password flow — takes priority over everything else.
  if (isSetupFlow) {
    return <SetupPassword />;
  }

  // Setup password route (manual hash)
  if (route.path === "/setup-password") {
    return <SetupPassword />;
  }

  // Public legal/info routes
  if (route.path === "/about-us") {
    return <LegalPage type="about-us" />;
  }
  if (route.path === "/privacy-policy") {
    return <LegalPage type="privacy-policy" />;
  }
  if (route.path === "/terms-of-service") {
    return <LegalPage type="terms-of-service" />;
  }
  if (route.path === "/data-policy") {
    return <LegalPage type="data-policy" />;
  }
  if (route.path === "/dmca-policy") {
    return <LegalPage type="dmca-policy" />;
  }

  // Client profile
  if (route.path.startsWith("/client/") && route.params.clientId && route.params.view === "profile") {
    if (!session) return <Home />;
    return <ClientProfile clientId={route.params.clientId} />;
  }

  // Client dashboard
  if (route.path.startsWith("/client/") && route.params.clientId) {
    if (!session) return <Home />;
    return <ClientDashboard clientId={route.params.clientId} />;
  }

  // Agent dashboard
  if (route.path === "/agent/dashboard") {
    if (!session) return <Home />;
    return <AgentDashboard />;
  }

  // Agent profile
  if (route.path === "/agent/profile") {
    if (!session) return <Home />;
    return <AgentProfile />;
  }

  // Default — home
  return <Home />;
}

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
