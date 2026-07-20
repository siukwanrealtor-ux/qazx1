import { useState, FormEvent } from "react";
import { X, Loader2, ImageIcon } from "lucide-react";
import type { Listing, ListingStatus, CustomerStatus } from "../lib/types";
import { LISTING_STATUSES, CUSTOMER_STATUSES } from "../lib/types";

const STOCK_PHOTOS = [
  "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&w=800",
  "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&w=800",
  "https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&w=800",
  "https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&w=800",
  "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&w=800",
  "https://images.pexels.com/photos/53610/large-pexels-photo-53610.jpeg?auto=compress&w=800",
];

interface Props {
  listing: Listing | null;
  searchId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ListingModal({ listing, searchId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    photo_url: listing?.photo_url || "",
    address: listing?.address || "",
    price: listing?.price?.toString() || "",
    beds: listing?.beds?.toString() || "",
    baths: listing?.baths?.toString() || "",
    sqft: listing?.sqft?.toString() || "",
    lot_size: listing?.lot_size || "",
    listing_status: (listing?.listing_status as ListingStatus) || "Active",
    last_updated: listing?.last_updated || new Date().toISOString().slice(0, 10),
    customer_status: (listing?.customer_status as CustomerStatus) || "New Lead",
    notes: listing?.notes || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      search_id: searchId,
      photo_url: form.photo_url || null,
      address: form.address || null,
      price: form.price ? parseFloat(form.price) : null,
      beds: form.beds ? parseInt(form.beds) : null,
      baths: form.baths ? parseFloat(form.baths) : null,
      sqft: form.sqft ? parseInt(form.sqft) : null,
      lot_size: form.lot_size || null,
      listing_status: form.listing_status,
      last_updated: form.last_updated || null,
      customer_status: form.customer_status,
      notes: form.notes || null,
    };

    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/listings${
      listing ? `?id=eq.${listing.id}` : ""
    }`;
    const method = listing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        Prefer: listing ? "return=minimal" : "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      setError(txt || "Failed to save listing");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto card p-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-ink-900">
            {listing ? "Edit listing" : "Add listing"}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Photo */}
          <div>
            <label className="label">Photo</label>
            <div className="flex gap-3">
              <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-300">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <input
                className="input flex-1"
                placeholder="Paste image URL…"
                value={form.photo_url}
                onChange={(e) => update("photo_url", e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STOCK_PHOTOS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => update("photo_url", url)}
                  className={`h-10 w-14 overflow-hidden rounded-md border-2 transition ${
                    form.photo_url === url
                      ? "border-brand-500"
                      : "border-transparent hover:border-ink-200"
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main St, Austin, TX 78701"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price ($)</label>
              <input
                className="input"
                type="number"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="450000"
              />
            </div>
            <div>
              <label className="label">Square feet</label>
              <input
                className="input"
                type="number"
                value={form.sqft}
                onChange={(e) => update("sqft", e.target.value)}
                placeholder="2100"
              />
            </div>
            <div>
              <label className="label">Beds</label>
              <input
                className="input"
                type="number"
                value={form.beds}
                onChange={(e) => update("beds", e.target.value)}
                placeholder="3"
              />
            </div>
            <div>
              <label className="label">Baths</label>
              <input
                className="input"
                type="number"
                step="0.5"
                value={form.baths}
                onChange={(e) => update("baths", e.target.value)}
                placeholder="2.5"
              />
            </div>
            <div>
              <label className="label">Lot size</label>
              <input
                className="input"
                value={form.lot_size}
                onChange={(e) => update("lot_size", e.target.value)}
                placeholder="0.25 acres"
              />
            </div>
            <div>
              <label className="label">Last updated</label>
              <input
                className="input"
                type="date"
                value={form.last_updated}
                onChange={(e) => update("last_updated", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Listing status</label>
              <select
                className="input"
                value={form.listing_status}
                onChange={(e) => update("listing_status", e.target.value)}
              >
                {LISTING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Customer status</label>
              <select
                className="input"
                value={form.customer_status}
                onChange={(e) => update("customer_status", e.target.value)}
              >
                {CUSTOMER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Client thoughts, offer status, next steps…"
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
                "Save listing"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
