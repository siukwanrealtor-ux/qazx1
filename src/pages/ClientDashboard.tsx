import { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  LogOut,
  Loader2,
  Search as SearchIcon,
  Home,
  BedDouble,
  Bath,
  Maximize,
  MapPin,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Agent, Client, Search, Listing, CustomerStatus } from "../lib/types";
import { CUSTOMER_STATUSES } from "../lib/types";
import ListingModal from "../components/ListingModal";
import AgentAvatar from "../components/AgentAvatar";

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

interface Props {
  clientId: string;
}

export default function ClientDashboard({ clientId }: Props) {
  const { signOut, user } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [searches, setSearches] = useState<Search[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [listingsBySearch, setListingsBySearch] = useState<
    Record<string, Listing[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");
  const [renamingSearchId, setRenamingSearchId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [listingModalSearchId, setListingModalSearchId] = useState<string | null>(
    null
  );
  const [accessDenied, setAccessDenied] = useState(false);

  // Load client + searches
  const loadAll = async () => {
    setLoading(true);
    let { data: clientData, error: clientErr } = await supabase
      .from("clients")
      .select(CLIENT_PROFILE_SELECT)
      .eq("id", clientId)
      .maybeSingle();

    if (clientErr && hasSchemaColumnError(clientErr.message)) {
      const fallback = await supabase
        .from("clients")
        .select(CLIENT_BASE_SELECT)
        .eq("id", clientId)
        .maybeSingle();
      clientData = fallback.data;
      clientErr = fallback.error;
    }

    if (clientErr || !clientData) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    setClient(normalizeClient(clientData as Partial<Client>));

    const { data: agentData } = await supabase
      .from("agents")
      .select("*")
      .eq("id", (clientData as Partial<Client>).agent_id)
      .maybeSingle();
    setAgent((agentData as Agent | null) || null);

    const { data: searchData } = await supabase
      .from("searches")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    const sList = (searchData as Search[]) || [];
    setSearches(sList);
    setExpanded(new Set(sList.map((s) => s.id)));
    setLoading(false);

    // Load listings for each search
    const map: Record<string, Listing[]> = {};
    await Promise.all(
      sList.map(async (s) => {
        const { data: ldata } = await supabase
          .from("listings")
          .select("*")
          .eq("search_id", s.id)
          .order("updated_at", { ascending: false });
        map[s.id] = (ldata as Listing[]) || [];
      })
    );
    setListingsBySearch(map);
  };

  useEffect(() => {
    loadAll();
  }, [clientId]);

  const reloadListings = async (searchId: string) => {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("search_id", searchId)
      .order("updated_at", { ascending: false });
    setListingsBySearch((prev) => ({
      ...prev,
      [searchId]: (data as Listing[]) || [],
    }));
  };

  const addSearch = async () => {
    if (!newSearchName.trim()) return;
    const { data } = await supabase
      .from("searches")
      .insert({ client_id: clientId, name: newSearchName.trim() })
      .select()
      .single();
    if (data) {
      const newSearch = data as Search;
      setSearches((prev) => [newSearch, ...prev]);
      setExpanded((prev) => new Set(prev).add(newSearch.id));
      setListingsBySearch((prev) => ({ ...prev, [newSearch.id]: [] }));
    }
    setNewSearchName("");
    setShowAddSearch(false);
  };

  const renameSearch = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    await supabase.from("searches").update({ name }).eq("id", id);
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
    setRenamingSearchId(null);
    setRenameValue("");
  };

  const startRenaming = (s: Search) => {
    setRenamingSearchId(s.id);
    setRenameValue(s.name);
  };

  const cancelRenaming = () => {
    setRenamingSearchId(null);
    setRenameValue("");
  };

  const deleteSearch = async (id: string) => {
    if (!confirm("Delete this search and all its listings?")) return;
    await supabase.from("searches").delete().eq("id", id);
    setSearches((prev) => prev.filter((s) => s.id !== id));
    setListingsBySearch((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const deleteListing = async (searchId: string, id: string) => {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("listings").delete().eq("id", id);
    reloadListings(searchId);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const goBack = () => {
    window.location.hash = "#/agent/dashboard";
  };

  const openProfile = () => {
    window.location.hash = `#/client/${clientId}/profile`;
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

  const websiteUrl = agent?.personal_website
    ? /^https?:\/\//i.test(agent.personal_website)
      ? agent.personal_website
      : `https://${agent.personal_website}`
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 text-center">
        <p className="text-lg font-semibold text-ink-900">Access denied</p>
        <p className="mt-1 text-sm text-ink-500">
          You don't have access to this client dashboard.
        </p>
        <button onClick={goBack} className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </div>
    );
  }

  const isAgentView = !!user && client?.user_id !== user.id;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            {isAgentView && (
              <button
                onClick={goBack}
                className="btn-ghost p-1.5"
                title="Back to clients"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
                <Building2 className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-display text-lg font-semibold tracking-tight text-ink-900">
                Realty Dash
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-ink-500 sm:block">
              {isAgentView ? "Agent view" : "Client view"}
            </span>
            <button onClick={signOut} className="btn-ghost" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {agent && (
          <div className="card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <AgentAvatar
                  name={agent.name}
                  email={agent.email}
                  photoUrl={agent.agent_photo_url}
                  sizeClassName="h-14 w-14"
                  textClassName="text-base"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                    Your agent
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ink-900">
                    {agent.name || agent.email}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-ink-400" />
                      {agent.email}
                    </span>
                    {agent.agent_phone_number && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-ink-400" />
                        {agent.agent_phone_number}
                      </span>
                    )}
                    {websiteUrl && (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700"
                      >
                        <Globe className="h-4 w-4" />
                        Personal website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client header */}
        <div className="mt-4 card overflow-hidden">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-xl font-semibold text-brand-700">
                {client?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                  Client
                </p>
                <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">
                  {client?.name}
                </h1>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink-500">
                  <span>{client?.email}</span>
                  {client?.phone && <span>• {client.phone}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge bg-brand-100 text-brand-700">
                {searches.length} {searches.length === 1 ? "search" : "searches"}
              </span>
              <button onClick={openProfile} className="btn-secondary py-1.5 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit profile
              </button>
            </div>
          </div>
        </div>

        {client && (
          <div className="mt-4 card p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-ink-900">Client criteria</h2>
              <span className="badge bg-ink-100 text-ink-700">
                {client.client_type === "renter" ? "Renter" : "Buyer"}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-600">
              Status: <span className="font-medium text-ink-900">{client.client_status || (client.client_type === "renter" ? "Searching" : "Active Search")}</span>
            </p>

            {client.client_type === "renter" ? (
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-ink-700 sm:grid-cols-2">
                <p>Budget: <span className="font-medium text-ink-900">{formatCurrency(client.rent_budget)}/mo</span></p>
                <p>Move-In: <span className="font-medium text-ink-900">{formatDate(client.desired_move_in_date)}</span></p>
                <p>Location: <span className="font-medium text-ink-900">{client.preferred_locations || "-"}</span></p>
                <p>Beds/Baths: <span className="font-medium text-ink-900">{client.bedrooms ?? "-"} / {client.bathrooms ?? "-"}</span></p>
                <p>Min Sq Ft: <span className="font-medium text-ink-900">{client.min_sqft?.toLocaleString() || "-"}</span></p>
                <p>Income: <span className="font-medium text-ink-900">{formatCurrency(client.household_income)}</span></p>
                <p>Credit Score: <span className="font-medium text-ink-900">{client.credit_score ?? "-"}</span></p>
                <p>Pets: <span className="font-medium text-ink-900">{client.pet_friendly ? "Yes" : "No"}</span></p>
                <p>Occupants: <span className="font-medium text-ink-900">{client.occupants ?? "-"}</span></p>
                <p>Adults: <span className="font-medium text-ink-900">{client.adults ?? "-"}</span></p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-ink-700 sm:grid-cols-2">
                <p>Purchase Price: <span className="font-medium text-ink-900">{formatCurrency(client.purchase_price)}</span></p>
                <p>Location: <span className="font-medium text-ink-900">{client.preferred_locations || "-"}</span></p>
                <p>Beds/Baths: <span className="font-medium text-ink-900">{client.bedrooms ?? "-"} / {client.bathrooms ?? "-"}</span></p>
                <p>Min Sq Ft: <span className="font-medium text-ink-900">{client.min_sqft?.toLocaleString() || "-"}</span></p>
                <p>School District: <span className="font-medium text-ink-900">{client.school_district || "-"}</span></p>
                <p>Pre-Approved: <span className="font-medium text-ink-900">{client.pre_approved ? "Yes" : "No"}</span></p>
                <p>Desired Purchase Date: <span className="font-medium text-ink-900">{formatDate(client.desired_purchase_date)}</span></p>
              </div>
            )}

            {client.other_information && (
              <div className="mt-4 border-t border-ink-50 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                  Other Information
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                  {client.other_information}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Searches section */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            Saved searches
          </h2>
          <button
            onClick={() => setShowAddSearch(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> New search
          </button>
        </div>

        {searches.length === 0 ? (
          <div className="mt-4 card flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
              <SearchIcon className="h-6 w-6 text-ink-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-ink-700">
              No searches yet
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Create a search to start adding listings.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {searches.map((s) => {
              const isOpen = expanded.has(s.id);
              const listings = listingsBySearch[s.id] || [];
              return (
                <div key={s.id} className="card overflow-hidden">
                  {/* Search header */}
                  <div className="flex items-center justify-between border-b border-ink-50 bg-ink-50/40 px-5 py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      {renamingSearchId === s.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            renameSearch(s.id);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-1.5"
                        >
                          <input
                            className="input h-8 py-1 text-sm"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") cancelRenaming();
                            }}
                            onBlur={() => {
                              if (renameValue.trim() && renameValue.trim() !== s.name) {
                                renameSearch(s.id);
                              } else {
                                cancelRenaming();
                              }
                            }}
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-brand-600 p-1.5 text-white transition hover:bg-brand-700"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRenaming}
                            className="rounded-md bg-ink-100 p-1.5 text-ink-500 transition hover:bg-ink-200"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => toggleExpand(s.id)}
                          className="flex min-w-0 items-center gap-2 text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-ink-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-ink-500" />
                          )}
                          <span className="truncate font-medium text-ink-900">{s.name}</span>
                          <span className="badge bg-ink-100 text-ink-600">
                            {listings.length} {listings.length === 1 ? "listing" : "listings"}
                          </span>
                        </button>
                      )}
                    </div>
                    {renamingSearchId !== s.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingListing(null);
                            setListingModalSearchId(s.id);
                          }}
                          className="btn-secondary py-1.5 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add listing
                        </button>
                        <button
                          onClick={() => startRenaming(s)}
                          className="btn-ghost p-1.5 text-ink-400 hover:text-ink-700"
                          title="Rename search"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSearch(s.id)}
                          className="btn-ghost p-1.5 text-ink-400 hover:text-red-600"
                          title="Delete search"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Listings */}
                  {isOpen && (
                    <div className="p-4">
                      {listings.length === 0 ? (
                        <p className="py-6 text-center text-sm text-ink-400">
                          No listings in this search yet.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {CUSTOMER_STATUSES.map((status) => {
                            const group = listings
                              .filter((l) => (l.customer_status as CustomerStatus) === status)
                              .slice()
                              .sort((a, b) => {
                                const ad = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                                const bd = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                                return bd - ad;
                              });
                            if (group.length === 0) return null;
                            return (
                              <div key={status}>
                                <div className="mb-2 flex items-center gap-2">
                                  <CustomerBadge status={status} />
                                  <span className="text-xs font-medium text-ink-400">
                                    {group.length} {group.length === 1 ? "listing" : "listings"}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {group.map((l) => (
                                    <ListingCard
                                      key={l.id}
                                      listing={l}
                                      onEdit={() => {
                                        setEditingListing(l);
                                        setListingModalSearchId(s.id);
                                      }}
                                      onDelete={() => deleteListing(s.id, l.id)}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add search inline modal */}
      {showAddSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            onClick={() => setShowAddSearch(false)}
          />
          <div className="relative z-10 w-full max-w-sm card p-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink-900">
                New search
              </h3>
              <button
                onClick={() => setShowAddSearch(false)}
                className="btn-ghost p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSearch();
              }}
              className="mt-4 space-y-3"
            >
              <input
                className="input"
                placeholder="e.g. Downtown condos under $500k"
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary w-full">
                Create search
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Listing modal */}
      {listingModalSearchId && (
        <ListingModal
          listing={editingListing}
          searchId={listingModalSearchId}
          onClose={() => {
            setListingModalSearchId(null);
            setEditingListing(null);
          }}
          onSaved={() => {
            reloadListings(listingModalSearchId);
            setListingModalSearchId(null);
            setEditingListing(null);
          }}
        />
      )}
    </div>
  );
}

function ListingCard({
  listing,
  onEdit,
  onDelete,
}: {
  listing: Listing;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 overflow-hidden rounded-xl border border-ink-100 bg-white p-3 shadow-soft transition hover:shadow-lift">
      {/* Thumbnail */}
      <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-ink-100">
        {listing.photo_url ? (
          <img
            src={listing.photo_url}
            alt={listing.address || "Listing"}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <Home className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          {listing.price != null && (
            <span className="font-display text-base font-semibold text-ink-900">
              ${listing.price.toLocaleString()}
            </span>
          )}
          {listing.address && (
            <span className="flex min-w-0 items-start gap-0.5 text-xs text-ink-500">
              <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span className="truncate">{listing.address}</span>
            </span>
          )}
        </div>

        {/* Specs */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
          {listing.beds != null && (
            <span className="flex items-center gap-0.5">
              <BedDouble className="h-3 w-3 text-ink-400" />
              {listing.beds} bd
            </span>
          )}
          {listing.baths != null && (
            <span className="flex items-center gap-0.5">
              <Bath className="h-3 w-3 text-ink-400" />
              {listing.baths} ba
            </span>
          )}
          {listing.sqft != null && (
            <span className="flex items-center gap-0.5">
              <Maximize className="h-3 w-3 text-ink-400" />
              {listing.sqft.toLocaleString()} sqft
            </span>
          )}
          {listing.lot_size && (
            <span className="text-ink-500">Lot: {listing.lot_size}</span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <CustomerBadge status={listing.customer_status as CustomerStatus} />
          {listing.source_url && (
            <a
              href={listing.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition hover:text-brand-800"
            >
              <ExternalLink className="h-3 w-3" />
              View listing
            </a>
          )}
          {listing.updated_at && (
            <span className="ml-auto text-xs text-ink-400">
              {new Date(listing.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {listing.notes && (
          <p className="mt-1 line-clamp-1 text-xs text-ink-500">{listing.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded-md bg-ink-50 p-1.5 text-ink-600 transition hover:bg-ink-100"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-md bg-ink-50 p-1.5 text-red-500 transition hover:bg-red-50"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CustomerBadge({ status }: { status: CustomerStatus }) {
  const colors: Record<CustomerStatus, string> = {
    "New Lead": "bg-blue-100 text-blue-700",
    Touring: "bg-gold-100 text-gold-700",
    Interested: "bg-brand-100 text-brand-700",
    "Not Interested": "bg-ink-100 text-ink-600",
    "Under Contract": "bg-purple-100 text-purple-700",
    Sold: "bg-ink-700 text-white",
  };
  return <span className={`badge ${colors[status]}`}>{status}</span>;
}
