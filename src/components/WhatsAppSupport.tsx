import { MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/16058463169";

export default function WhatsAppSupport() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with support on WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-900/20 transition-all duration-300 hover:h-16 hover:w-16 hover:shadow-xl hover:shadow-emerald-900/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40"
    >
      <MessageCircle className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-ink-900 px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100">
        Need help? Chat with us
      </span>
    </a>
  );
}
