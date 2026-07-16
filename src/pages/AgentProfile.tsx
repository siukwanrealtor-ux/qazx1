import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  LogOut,
  Save,
  Trash2,
  X,
} from "lucide-react";
import AgentAvatar from "../components/AgentAvatar";
import { useAuth } from "../lib/auth";
import { createCroppedImageBlob } from "../lib/imageCrop";
import { supabase } from "../lib/supabase";

const PROFILE_PHOTO_BUCKET = "agent-profile-photos";

interface ProfileFormState {
  name: string;
  agent_phone_number: string;
  agent_license_number: string;
  broker_name: string;
  broker_license_number: string;
  office_address: string;
  personal_website: string;
  about_me: string;
  agent_photo_url: string;
}

function buildForm(agent: ReturnType<typeof useAuth>["agent"]): ProfileFormState {
  return {
    name: agent?.name || "",
    agent_phone_number: agent?.agent_phone_number || "",
    agent_license_number: agent?.agent_license_number || "",
    broker_name: agent?.broker_name || "",
    broker_license_number: agent?.broker_license_number || "",
    office_address: agent?.office_address || "",
    personal_website: agent?.personal_website || "",
    about_me: agent?.about_me || "",
    agent_photo_url: agent?.agent_photo_url || "",
  };
}

function parseStoragePath(publicUrl: string | null | undefined, bucket: string) {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function normalizeWebsite(url: string) {
  const value = url.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function AgentProfile() {
  const { agent, user, signOut, refreshAgent } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(() => buildForm(agent));
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);
  const [pendingPhotoPreviewUrl, setPendingPhotoPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm(buildForm(agent));
    setError(null);
  }, [agent]);

  useEffect(() => {
    return () => {
      if (pendingPhotoPreviewUrl) {
        URL.revokeObjectURL(pendingPhotoPreviewUrl);
      }
      if (cropSource) {
        URL.revokeObjectURL(cropSource);
      }
    };
  }, [pendingPhotoPreviewUrl, cropSource]);

  const photoPreviewUrl = removePhoto
    ? null
    : pendingPhotoPreviewUrl || form.agent_photo_url || null;

  const update = (key: keyof ProfileFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const goBack = () => {
    window.location.hash = "#/agent/dashboard";
  };

  const resetPendingPhoto = () => {
    if (pendingPhotoPreviewUrl) {
      URL.revokeObjectURL(pendingPhotoPreviewUrl);
    }
    setPendingPhotoBlob(null);
    setPendingPhotoPreviewUrl(null);
  };

  const handleCancel = () => {
    setForm(buildForm(agent));
    setRemovePhoto(false);
    resetPendingPhoto();
    setSuccess(null);
    setError(null);
    goBack();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photos must be 5MB or smaller.");
      return;
    }

    setError(null);
    setSuccess(null);
    if (cropSource) {
      URL.revokeObjectURL(cropSource);
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropSource(URL.createObjectURL(file));
  };

  const handleApplyCrop = async () => {
    if (!cropSource || !croppedAreaPixels) return;
    setUploadingPhoto(true);
    setError(null);

    try {
      const blob = await createCroppedImageBlob(cropSource, {
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
      });

      resetPendingPhoto();
      const previewUrl = URL.createObjectURL(blob);
      setPendingPhotoBlob(blob);
      setPendingPhotoPreviewUrl(previewUrl);
      setRemovePhoto(false);
      setCropSource(null);
    } catch (cropError) {
      setError((cropError as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    resetPendingPhoto();
    setRemovePhoto(true);
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!agent || !user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    let nextPhotoUrl = form.agent_photo_url || null;
    let uploadedPath: string | null = null;

    try {
      if (pendingPhotoBlob) {
        uploadedPath = `${user.id}/profile-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(PROFILE_PHOTO_BUCKET)
          .upload(uploadedPath, pendingPhotoBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        nextPhotoUrl = supabase.storage
          .from(PROFILE_PHOTO_BUCKET)
          .getPublicUrl(uploadedPath).data.publicUrl;
      } else if (removePhoto) {
        nextPhotoUrl = null;
      }

      const payload = {
        name: form.name.trim() || null,
        agent_phone_number: form.agent_phone_number.trim() || null,
        agent_license_number: form.agent_license_number.trim() || null,
        broker_name: form.broker_name.trim() || null,
        broker_license_number: form.broker_license_number.trim() || null,
        office_address: form.office_address.trim() || null,
        about_me: form.about_me.trim() || null,
        personal_website: normalizeWebsite(form.personal_website) || null,
        agent_photo_url: nextPhotoUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from("agents")
        .update(payload)
        .eq("id", agent.id);

      if (saveError) {
        throw saveError;
      }

      const previousPath = parseStoragePath(agent.agent_photo_url, PROFILE_PHOTO_BUCKET);
      const shouldDeletePreviousPhoto = previousPath && (removePhoto || !!pendingPhotoBlob);
      if (shouldDeletePreviousPhoto) {
        await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([previousPath]);
      }

      await refreshAgent();
      setForm((current) => ({
        ...current,
        personal_website: normalizeWebsite(current.personal_website),
        agent_photo_url: nextPhotoUrl || "",
      }));
      setSuccess("Profile updated successfully.");
      setRemovePhoto(false);
      resetPendingPhoto();
    } catch (saveError) {
      if (uploadedPath) {
        await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([uploadedPath]);
      }
      setError((saveError as Error).message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={goBack} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                Agent settings
              </p>
              <h1 className="font-display text-2xl font-semibold text-ink-900">
                Agent Profile
              </h1>
            </div>
          </div>
          <button onClick={signOut} className="btn-ghost" title="Sign out">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="card p-6">
            <div className="flex flex-col items-center text-center">
              <AgentAvatar
                name={form.name || agent.name}
                email={agent.email}
                photoUrl={photoPreviewUrl}
                sizeClassName="h-28 w-28"
                textClassName="text-2xl"
              />
              <h2 className="mt-4 font-display text-xl font-semibold text-ink-900">
                {form.name || agent.name || agent.email}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{agent.email}</p>
              <p className="mt-1 text-sm text-ink-500">
                {form.agent_phone_number || "No mobile phone number yet"}
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary w-full"
                disabled={saving || uploadingPhoto}
              >
                <Camera className="h-4 w-4" />
                {photoPreviewUrl ? "Replace Photo" : "Upload Photo"}
              </button>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="btn-ghost w-full"
                disabled={(!photoPreviewUrl && !pendingPhotoBlob) || saving || uploadingPhoto}
              >
                <Trash2 className="h-4 w-4" /> Remove Photo
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="mt-6 rounded-2xl bg-ink-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                Account email
              </p>
              <p className="mt-2 text-sm text-ink-700">{agent.email}</p>
              <p className="mt-1 text-xs text-ink-500">
                Email and login are managed separately and cannot be changed here.
              </p>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">
                Personal Information
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Full name</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="John Smith"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input className="input bg-ink-50 text-ink-500" value={agent.email} readOnly />
                </div>
                <div>
                  <label className="label">Mobile phone number</label>
                  <input
                    className="input"
                    value={form.agent_phone_number}
                    onChange={(event) => update("agent_phone_number", event.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Personal website</label>
                  <input
                    className="input"
                    value={form.personal_website}
                    onChange={(event) => update("personal_website", event.target.value)}
                    placeholder="www.johnsmithhomes.com"
                  />
                </div>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">
                License Information
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Real Estate License Number</label>
                  <input
                    className="input"
                    value={form.agent_license_number}
                    onChange={(event) => update("agent_license_number", event.target.value)}
                    placeholder="RE-123456"
                  />
                </div>
                <div>
                  <label className="label">Broker Name</label>
                  <input
                    className="input"
                    value={form.broker_name}
                    onChange={(event) => update("broker_name", event.target.value)}
                    placeholder="Acme Realty"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Broker License Number</label>
                  <input
                    className="input"
                    value={form.broker_license_number}
                    onChange={(event) => update("broker_license_number", event.target.value)}
                    placeholder="BR-987654"
                  />
                </div>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">
                Office Information
              </h2>
              <div className="mt-5">
                <label className="label">Office Address</label>
                <input
                  className="input"
                  value={form.office_address}
                  onChange={(event) => update("office_address", event.target.value)}
                  placeholder="123 Main Street, Austin, TX 78701"
                />
              </div>
            </section>

            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">
                Biography
              </h2>
              <div className="mt-5">
                <label className="label">About Me</label>
                <textarea
                  className="input min-h-[180px] resize-y"
                  value={form.about_me}
                  onChange={(event) => update("about_me", event.target.value)}
                  placeholder="Tell clients about your background, markets, and how you work."
                />
              </div>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleCancel} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving || uploadingPhoto}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </main>

      {cropSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setCropSource(null)} />
          <div className="relative z-10 w-full max-w-2xl card p-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-ink-900">Crop profile photo</h3>
                <p className="mt-1 text-sm text-ink-500">Use a square crop for the profile image.</p>
              </div>
              <button type="button" onClick={() => setCropSource(null)} className="btn-ghost p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-5 h-80 overflow-hidden rounded-2xl bg-ink-950">
              <Cropper
                image={cropSource}
                crop={crop}
                zoom={zoom}
                aspect={1}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </div>

            <div className="mt-5">
              <label className="label">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCropSource(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="btn-primary"
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}