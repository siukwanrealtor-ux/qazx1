interface AgentAvatarProps {
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  sizeClassName?: string;
  textClassName?: string;
}

export function getInitials(name?: string | null, email?: string | null) {
  const source = (name || "").trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  const fallback = (email || "").trim();
  return fallback.slice(0, 2).toUpperCase() || "AG";
}

export default function AgentAvatar({
  name,
  email,
  photoUrl,
  sizeClassName = "h-16 w-16",
  textClassName = "text-lg",
}: AgentAvatarProps) {
  const initials = getInitials(name, email);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-brand-100 font-semibold text-brand-700 ${sizeClassName} ${textClassName}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name || email || "Agent"} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}