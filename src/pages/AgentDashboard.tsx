import { useState, useEffect, FormEvent, useMemo } from "react";
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
  Search as SearchIcon,
  X,
  UserRound,
  Globe,
  Trash2,
  Send,
  ArrowDownUp,
  UserPlus,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Client } from "../lib/types";
import AgentAvatar from "../components/AgentAvatar";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

const CLIENT_BASE_SELECT = "id,agent_id,user_id,name,phone,email,created_at";
const CLIENT_PROFILE_SELECT =
  "id,agent_id,user_id,name,phone,email,created_at,client_type,client_status,purchase_price,rent_budget,desired_move_in_date,desired_purchase_date,preferred_locations,bedrooms,bathrooms,min_sqft,school_district,pre_approved,pet_friendly,household_income,credit_score,other_information,occupants,adults";

const hasSchemaColumnError = (message?: string) => {
  if (!message) return false;
  return /schema cache/i.test(message) && /column/i.test(message);
};

const normalizeClient = (row: Partial<Client>): Client => ({
  id: row.id || "",
  agent_id: row.agent_id || "",
  user_id: row.user_id ?? null,
  name: row.name || "",
  phone: row.phone ?? null,
  email: row.email || "",
  client_type: row.client_type ?? null,
  client_status: row.client_status ?? null,
  purchase_price: row.purchase_price ?? null,
  rent_budget: row.rent_budget ?? null,
  desired_move_in_date: row.desired_move_in_date ?? null,
  desired_purchase_date: row.desired_purchase_date ?? null,
  preferred_locations: row.preferred_locations ?? null,
  bedrooms: row.bedrooms ?? null,
  bathrooms: row.bathrooms ?? null,
  min_sqft: row.min_sqft ?? null,
  school_district: row.school_district ?? null,
  pre_approved: row.pre_approved ?? null,
  pet_friendly: row.pet_friendly ?? null,
  household_income: row.household_income ?? null,
  credit_score: row.credit_score ?? null,
  other_information: row.other_information ?? null,
  occupants: row.occupants ?? null,
  adults: row.adults ?? null,
  created_at: row.created_at || "",
});

type SortKey = "name" | "created_at" | "status";
type FilterKey = "all" | "active" | "pending";

export default function AgentDashboard() {
  const { agent, signOut, refreshAgent } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reinvitingId, setReinvitingId] = useState<string | null>(null);

  const loadClients = async () => {
    if (!agent) return;
    let { data, error } = await supabase
      .from("clients")
      .select(CLIENT_PROFILE_SELECT)
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });

    if (error && hasSchemaColumnError(error.message)) {
      const fallback = await supabase
        .from("clients")
        .select(CLIENT_BASE_SELECT)
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error) {
      setClients([]);
      setLoading(false);
      return;
    }

    setClients(((data as Partial<Client>[]) || []).map(normalizeClient));
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, [agent]);

  useEffect(() => {
    refreshAgent();
  }, [refreshAgent]);

  const filteredAndSorted = useMemo(() => {
    let result = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    if (filterKey === "active") result = result.filter((c) => c.user_id);
    if (filterKey === "pending") result = result.filter((c) => !c.user_id);

    result = result.slice().sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return (a.user_id ? 1 : 0) - (b.user_id ? 1 : 0);
        case "created_at":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [clients, search, sortKey, filterKey]);

  const openClientDashboard = (clientId: string) => {
    window.location.hash = `#/client/${clientId}`;
  };

  const openClientProfile = (clientId: string) => {
    window.location.hash = `#/client/${clientId}/profile`;
  };

  const copyLink = (clientId: string) => {
    const link = `${window.location.origin}${window.location.pathname}#/client/${clientId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(clientId);
    toast("Dashboard link copied", "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openProfile = () => {
    window.location.hash = "#/agent/profile";
  };

  const handleDeleteClient = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast(`${deleteTarget.name} removed from your roster`, "success");
      setDeleteTarget(null);
    } catch {
      toast("Unable to remove client. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleReinvite = async (client: Client) => {
    setReinvitingId(client.id);
    try {
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const res = await fetch(funcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: client.email.trim().toLowerCase(),
          role: "client",
          agentId: client.agent_id,
          clientName: client.name,
          phone: client.phone || undefined,
          redirectTo: window.location.origin + window.location.pathname,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resend invite");
      toast(`Setup link re-sent to ${client.email}`, "success");
    } catch {
      toast("Unable to resend invite. Please try again.", "error");
    } finally {
      setReinvitingId(null);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAgentPhone = (value: unknown) => {
    if (value == null) return "No phone number on file";
    const normalized = String(value).trim();
    return normalized || "No phone number on file";
  };

  if (!agent && !loading) {
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
              Realty Dash
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:max-w-2xl">
            <button
              type="button"
              onClick={openProfile}
              className="flex items-center gap-4 text-left"
            >
              <div className="relative">
                <AgentAvatar
                  name={agent?.name}
                  email={agent?.email}
                  photoUrl={agent?.agent_photo_url}
                  sizeClassName="h-16 w-16"
                  textClassName="text-lg"
                />
                {agent?.company_logo_url && (
                  <img
                    src={agent.company_logo_url}
                    alt={agent.broker_name || "Company logo"}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg border-2 border-white bg-white object-cover shadow-sm"
                  />
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-ink-900">
                  {agent?.name || "Agent"}
                </p>
                <p className="mt-0.5 text-sm text-ink-500">{agent?.email}</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  {formatAgentPhone(agent?.agent_phone_number)}
                </p>
                {agent?.personal_website && (
                  <a
                    href={agent.personal_website.startsWith("http") ? agent.personal_website : `https://${agent.personal_website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-brand-700 transition hover:text-brand-800"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">
                      {agent.personal_website.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                )}
              </div>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={openProfile} className="btn-secondary">
                <UserRound className="h-4 w-4" /> Profile
              </button>
              <button onClick={signOut} className="btn-ghost" title="Sign out" aria-label="Sign out">
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

        {/* Search + filter + sort */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search clients"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-ink-200 bg-white p-0.5 shadow-sm">
              {(["all", "active", "pending"] as FilterKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilterKey(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    filterKey === key
                      ? "bg-brand-600 text-white"
                      : "text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="relative">
              <ArrowDownUp className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-lg border border-ink-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-ink-700 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                aria-label="Sort clients"
              >
                <option value="created_at">Date added</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client cards */}
        <div className="mt-4 card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
                <Users className="h-6 w-6 text-ink-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-ink-700">
                {search || filterKey !== "all" ? "No clients match your filters." : "No clients yet."}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {search || filterKey !== "all" ? "" : "Add your first client to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
              {filteredAndSorted.map((c) => {
                const isRenter = c.client_type === "renter";
                const profileStatus = c.client_status || (isRenter ? "Searching" : "Active Search");

                return (
                  <div key={c.id} className="rounded-xl border border-ink-100 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-xl font-semibold text-ink-900">{c.name}</p>
                        <p className="mt-0.5 text-sm text-ink-500">{isRenter ? "Renter" : "Buyer"}</p>
                        <p className="mt-2 text-sm text-ink-700">
                          Status: <span className="font-medium text-ink-900">{profileStatus}</span>
                        </p>
                        <p className="mt-1 text-xs text-ink-400">
                          Added {formatDate(c.created_at)}
                        </p>
                      </div>
                      {c.user_id ? (
                        <span className="badge bg-brand-100 text-brand-700">Active</span>
                      ) : (
                        <span className="badge bg-gold-100 text-gold-700">Invite sent</span>
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5 text-sm text-ink-700">
                      {isRenter ? (
                        <>
                          <p>Budget: <span className="font-medium text-ink-900">{formatCurrency(c.rent_budget)}/mo</span></p>
                          <p>Move-In: <span className="font-medium text-ink-900">{formatDate(c.desired_move_in_date)}</span></p>
                          <p>Location: <span className="font-medium text-ink-900">{c.preferred_locations || "-"}</span></p>
                          <p>Beds/Baths: <span className="font-medium text-ink-900">{c.bedrooms ?? "-"} / {c.bathrooms ?? "-"}</span></p>
                          <p>Min Sq Ft: <span className="font-medium text-ink-900">{c.min_sqft?.toLocaleString() || "-"}</span></p>
                          <p>Income: <span className="font-medium text-ink-900">{formatCurrency(c.household_income)}</span></p>
                          <p>Credit Score: <span className="font-medium text-ink-900">{c.credit_score ?? "-"}</span></p>
                          <p>Pets: <span className="font-medium text-ink-900">{c.pet_friendly ? "Yes" : "No"}</span></p>
                          <p>Occupants: <span className="font-medium text-ink-900">{c.occupants ?? "-"}</span></p>
                          <p>Adults: <span className="font-medium text-ink-900">{c.adults ?? "-"}</span></p>
                        </>
                      ) : (
                        <>
                          <p>Purchase Price: <span className="font-medium text-ink-900">{formatCurrency(c.purchase_price)}</span></p>
                          <p>Location: <span className="font-medium text-ink-900">{c.preferred_locations || "-"}</span></p>
                          <p>Beds/Baths: <span className="font-medium text-ink-900">{c.bedrooms ?? "-"} / {c.bathrooms ?? "-"}</span></p>
                          <p>Min Sq Ft: <span className="font-medium text-ink-900">{c.min_sqft?.toLocaleString() || "-"}</span></p>
                          <p>School District: <span className="font-medium text-ink-900">{c.school_district || "-"}</span></p>
                          <p>Pre-Approved: <span className="font-medium text-ink-900">{c.pre_approved ? "Yes" : "No"}</span></p>
                          <p>Desired Purchase Date: <span className="font-medium text-ink-900">{formatDate(c.desired_purchase_date)}</span></p>
                        </>
                      )}
                    </div>

                    {c.other_information && (
                      <div className="mt-4 border-t border-ink-50 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                          Other Information
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                          {c.other_information}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openClientDashboard(c.id)}
                        className="btn-secondary py-1.5 text-xs"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openClientProfile(c.id)}
                        className="btn-secondary py-1.5 text-xs"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={() => copyLink(c.id)}
                        className="btn-ghost py-1.5 text-xs"
                        aria-label={`Copy dashboard link for ${c.name}`}
                        title="Copy dashboard link"
                      >
                        {copiedId === c.id ? (
                          <Check className="h-3.5 w-3.5 text-brand-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {!c.user_id && (
                        <button
                          onClick={() => handleReinvite(c)}
                          className="btn-ghost py-1.5 text-xs"
                          disabled={reinvitingId === c.id}
                          aria-label={`Resend setup invite to ${c.name}`}
                          title="Resend setup invite"
                        >
                          {reinvitingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Resend
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="btn-ghost py-1.5 text-xs text-ink-400 hover:text-red-600"
                        aria-label={`Remove ${c.name} from roster`}
                        title="Remove client"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-col gap-0.5 text-xs text-ink-600">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 text-xs text-ink-500 sm:px-6">
          <a href="#/about-us" className="transition hover:text-ink-800">About Us</a>
          <a href="#/privacy-policy" className="transition hover:text-ink-800">Privacy Policy</a>
          <a href="#/terms-of-service" className="transition hover:text-ink-800">Terms of Service</a>
          <a href="#/data-policy" className="transition hover:text-ink-800">Data Policy</a>
          <a href="#/dmca-policy" className="transition hover:text-ink-800">DMCA Policy</a>
        </div>
      </footer>

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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove client"
        message={`Are you sure you want to remove ${deleteTarget?.name}? Their searches and listings will also be deleted. This cannot be undone.`}
        confirmLabel="Remove client"
        variant="danger"
        onConfirm={handleDeleteClient}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
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
  const { toast } = useToast();
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
      toast(`${name} added — invite email sent`, "success");
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
              <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close dialog">
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
                    <>
                      <UserPlus className="h-4 w-4" /> Add client
                    </>
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
