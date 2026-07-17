import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Building2, Loader2, LogOut, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Client } from "../lib/types";

interface Props {
  clientId: string;
}

type ClientType = "buyer" | "renter";

const BUYER_STATUSES = ["Active Search", "Touring", "Offer Ready", "Paused"];
const RENTER_STATUSES = ["Searching", "Touring", "Applying", "Paused"];

const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ClientProfile({ clientId }: Props) {
  const { signOut, user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [clientType, setClientType] = useState<ClientType>("buyer");
  const [clientStatus, setClientStatus] = useState("Active Search");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [rentBudget, setRentBudget] = useState("");
  const [desiredMoveInDate, setDesiredMoveInDate] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [minSqft, setMinSqft] = useState("");
  const [schoolDistrict, setSchoolDistrict] = useState("");
  const [preApproved, setPreApproved] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [householdIncome, setHouseholdIncome] = useState("");
  const [creditScore, setCreditScore] = useState("");

  const loadClient = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .maybeSingle();

    if (error || !data) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    const c = data as Client;
    setClient(c);

    setName(c.name || "");
    setPhone(c.phone || "");
    setEmail(c.email || "");
    setClientType((c.client_type || "buyer") as ClientType);
    setClientStatus(
      c.client_status || (c.client_type === "renter" ? "Searching" : "Active Search")
    );
    setPurchasePrice(c.purchase_price != null ? String(c.purchase_price) : "");
    setRentBudget(c.rent_budget != null ? String(c.rent_budget) : "");
    setDesiredMoveInDate(c.desired_move_in_date || "");
    setPreferredLocations(c.preferred_locations || "");
    setBedrooms(c.bedrooms != null ? String(c.bedrooms) : "");
    setBathrooms(c.bathrooms != null ? String(c.bathrooms) : "");
    setMinSqft(c.min_sqft != null ? String(c.min_sqft) : "");
    setSchoolDistrict(c.school_district || "");
    setPreApproved(Boolean(c.pre_approved));
    setPetFriendly(Boolean(c.pet_friendly));
    setHouseholdIncome(c.household_income != null ? String(c.household_income) : "");
    setCreditScore(c.credit_score != null ? String(c.credit_score) : "");
    setLoading(false);
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const onTypeChange = (nextType: ClientType) => {
    setClientType(nextType);
    if (nextType === "buyer") {
      setClientStatus(BUYER_STATUSES.includes(clientStatus) ? clientStatus : "Active Search");
    } else {
      setClientStatus(RENTER_STATUSES.includes(clientStatus) ? clientStatus : "Searching");
    }
  };

  const goBack = () => {
    window.location.hash = `#/client/${clientId}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim().toLowerCase(),
      client_type: clientType,
      client_status: clientStatus.trim() || null,
      purchase_price: clientType === "buyer" ? toNumberOrNull(purchasePrice) : null,
      rent_budget: clientType === "renter" ? toNumberOrNull(rentBudget) : null,
      desired_move_in_date: clientType === "renter" ? desiredMoveInDate || null : null,
      preferred_locations: preferredLocations.trim() || null,
      bedrooms: toNumberOrNull(bedrooms),
      bathrooms: toNumberOrNull(bathrooms),
      min_sqft: toNumberOrNull(minSqft),
      school_district: clientType === "buyer" ? schoolDistrict.trim() || null : null,
      pre_approved: clientType === "buyer" ? preApproved : null,
      pet_friendly: clientType === "renter" ? petFriendly : null,
      household_income: clientType === "renter" ? toNumberOrNull(householdIncome) : null,
      credit_score: clientType === "renter" ? toNumberOrNull(creditScore) : null,
    };

    const { error } = await supabase.from("clients").update(payload).eq("id", clientId);

    if (error) {
      setSaveMessage(error.message);
      setSaving(false);
      return;
    }

    setSaveMessage("Client profile saved.");
    setSaving(false);
    await loadClient();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (accessDenied || !client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 text-center">
        <p className="text-lg font-semibold text-ink-900">Access denied</p>
        <p className="mt-1 text-sm text-ink-500">You do not have access to this client profile.</p>
        <button onClick={goBack} className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </div>
    );
  }

  const isAgentView = !!user && client.user_id !== user.id;
  const statuses = clientType === "buyer" ? BUYER_STATUSES : RENTER_STATUSES;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="btn-ghost p-1.5" title="Back to client dashboard">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
                <Building2 className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-display text-lg font-semibold tracking-tight text-ink-900">EstateSync</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-ink-500 sm:block">
              {isAgentView ? "Agent editing client profile" : "Client profile"}
            </span>
            <button onClick={signOut} className="btn-ghost" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="card p-6">
          <h1 className="font-display text-2xl font-semibold text-ink-900">Client profile</h1>
          <p className="mt-1 text-sm text-ink-500">
            Update client details and criteria for a buyer or renter search.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-500">Contact</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-500">Search type</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onTypeChange("buyer")}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    clientType === "buyer"
                      ? "border-brand-500 bg-brand-50 text-brand-800"
                      : "border-ink-200 bg-white text-ink-700 hover:border-brand-200"
                  }`}
                >
                  <p className="text-sm font-semibold">Buyer</p>
                  <p className="mt-1 text-xs">Purchase-focused search criteria</p>
                </button>
                <button
                  type="button"
                  onClick={() => onTypeChange("renter")}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    clientType === "renter"
                      ? "border-brand-500 bg-brand-50 text-brand-800"
                      : "border-ink-200 bg-white text-ink-700 hover:border-brand-200"
                  }`}
                >
                  <p className="text-sm font-semibold">Renter</p>
                  <p className="mt-1 text-xs">Rental-focused search criteria</p>
                </button>
              </div>

              <div>
                <label className="label">Status</label>
                <select className="input" value={clientStatus} onChange={(e) => setClientStatus(e.target.value)}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-500">Criteria</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {clientType === "buyer" ? (
                  <div>
                    <label className="label">Purchase Price</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="750000"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label">Rent Budget</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={rentBudget}
                      onChange={(e) => setRentBudget(e.target.value)}
                      placeholder="2800"
                    />
                  </div>
                )}

                {clientType === "renter" && (
                  <div>
                    <label className="label">Desired Move-In Date</label>
                    <input
                      className="input"
                      type="date"
                      value={desiredMoveInDate}
                      onChange={(e) => setDesiredMoveInDate(e.target.value)}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="label">Preferred City or Neighborhood</label>
                  <input
                    className="input"
                    value={preferredLocations}
                    onChange={(e) => setPreferredLocations(e.target.value)}
                    placeholder="Rancho Cucamonga, Upland"
                  />
                </div>

                <div>
                  <label className="label">Bedrooms</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="4"
                  />
                </div>

                <div>
                  <label className="label">Bathrooms</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.5"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="3"
                  />
                </div>

                <div>
                  <label className="label">Minimum Square Footage</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={minSqft}
                    onChange={(e) => setMinSqft(e.target.value)}
                    placeholder="2200"
                  />
                </div>

                {clientType === "buyer" && (
                  <>
                    <div>
                      <label className="label">School District</label>
                      <input
                        className="input"
                        value={schoolDistrict}
                        onChange={(e) => setSchoolDistrict(e.target.value)}
                        placeholder="Upland Unified"
                      />
                    </div>
                    <label className="mt-8 inline-flex items-center gap-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={preApproved}
                        onChange={(e) => setPreApproved(e.target.checked)}
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      Pre-Approved
                    </label>
                  </>
                )}

                {clientType === "renter" && (
                  <>
                    <div>
                      <label className="label">Household Income</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={householdIncome}
                        onChange={(e) => setHouseholdIncome(e.target.value)}
                        placeholder="95000"
                      />
                    </div>
                    <div>
                      <label className="label">Credit Score</label>
                      <input
                        className="input"
                        type="number"
                        min="300"
                        max="850"
                        value={creditScore}
                        onChange={(e) => setCreditScore(e.target.value)}
                        placeholder="720"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={petFriendly}
                        onChange={(e) => setPetFriendly(e.target.checked)}
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      Pet-friendly
                    </label>
                  </>
                )}
              </div>
            </section>

            {saveMessage && (
              <p className={`rounded-lg px-3 py-2 text-sm ${saveMessage.includes("saved") ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}>
                {saveMessage}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={goBack} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
