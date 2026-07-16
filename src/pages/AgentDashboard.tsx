import { useState, useEffect, FormEvent } from "react";
import {
  Building2,
  Plus,
  Users,
  LogOut,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Phone,
  Mail,
  Search,
  X,
  UserRound,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Client } from "../lib/types";
import AgentAvatar from "../components/AgentAvatar";

export default function AgentDashboard() {
  const { agent, signOut, refreshAgent } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadClients = async () => {
    if (!agent) return;
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, [agent]);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openClientDashboard = (clientId: string) => {
    window.location.hash = `#/client/${clientId}`;
  };

  const copyLink = (clientId: string) => {
    const link = `${window.location.origin}${window.location.pathname}#/client/${clientId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openProfile = () => {
    window.location.hash = "#/agent/profile";
  };

  if (!agent && !loading) {
    // Not an agent — bounce home.
    window.location.hash = "#/";
    return null;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Building2 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-ink-900">
              EstateSync
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:max-w-2xl">
            <button
              type="button"
              onClick={openProfile}
              className="flex items-center gap-4 text-left"
            >
              <AgentAvatar
                name={agent?.name}
                email={agent?.email}
                photoUrl={agent?.agent_photo_url}
                sizeClassName="h-16 w-16"
                textClassName="text-lg"
              />
              <div>
                <p className="text-base font-semibold text-ink-900">
                  {agent?.name || "Agent"}
                </p>
                <p className="mt-0.5 text-sm text-ink-500">{agent?.email}</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  {agent?.agent_phone_number || "Mobile phone number"}
                </p>
              </div>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={openProfile} className="btn-secondary">
                <UserRound className="h-4 w-4" /> Profile
              </button>
              <button onClick={signOut} className="btn-ghost" title="Sign out">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900">
              Clients
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Manage your clients and open their listing dashboards.
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add client
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total clients" value={clients.length} icon={<Users className="h-5 w-5" />} />
          <StatCard
            label="Active accounts"
            value={clients.filter((c) => c.user_id).length}
            icon={<Check className="h-5 w-5" />}
          />
          <StatCard
            label="Pending invites"
            value={clients.filter((c) => !c.user_id).length}
            icon={<Mail className="h-5 w-5" />}
          />
        </div>

        {/* Search */}
        <div className="mt-6 relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Clients table */}
        <div className="mt-4 card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
                <Users className="h-6 w-6 text-ink-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-ink-700">
                {search ? "No clients match your search." : "No clients yet."}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {search ? "" : "Add your first client to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {filtered.map((c) => (
                    <tr key={c.id} className="group transition hover:bg-ink-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-ink-900">{c.name}</p>
                            <p className="text-xs text-ink-400">
                              Added {new Date(c.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5 text-xs text-ink-600">
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-ink-400" />
                            {c.email}
                          </span>
                          {c.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-ink-400" />
                              {c.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {c.user_id ? (
                          <span className="badge bg-brand-100 text-brand-700">
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-gold-100 text-gold-700">
                            Invite sent
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openClientDashboard(c.id)}
                            className="btn-secondary py-1.5 text-xs"
                          >
                            Open <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => copyLink(c.id)}
                            className="btn-ghost py-1.5 text-xs"
                            title="Copy dashboard link"
                          >
                            {copiedId === c.id ? (
                              <Check className="h-3.5 w-3.5 text-brand-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showAdd && agent && (
        <AddClientModal
          agentId={agent.id}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            loadClients();
            refreshAgent();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <div>
        <p className="font-display text-2xl font-semibold text-ink-900">
          {value}
        </p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function AddClientModal({
  agentId,
  onClose,
  onCreated,
}: {
  agentId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const res = await fetch(funcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role: "client",
          agentId,
          clientName: name.trim(),
          phone: phone.trim() || undefined,
          redirectTo: window.location.origin + window.location.pathname,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add client");
      setSuccess(true);
      setTimeout(onCreated, 1800);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md card p-6 animate-fade-in-up">
        {success ? (
          <div className="text-center py-4">
            <Check className="mx-auto h-12 w-12 text-brand-500" />
            <h3 className="mt-3 font-display text-xl font-semibold text-ink-900">
              Client added!
            </h3>
            <p className="mt-1.5 text-sm text-ink-500">
              We've emailed {email} a link to set their password.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-ink-900">
                Add new client
              </h3>
              <button onClick={onClose} className="btn-ghost p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              The client will receive an email to set up their password and access
              their dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Chen"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Phone number</label>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="label">Email address</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@email.com"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add client"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
