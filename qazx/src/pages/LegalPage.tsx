import { ArrowLeft, Building2 } from "lucide-react";

export type LegalPageType =
  | "about-us"
  | "privacy-policy"
  | "terms-of-service"
  | "data-policy"
  | "dmca-policy";

interface Section {
  heading: string;
  body: string;
}

interface LegalContent {
  title: string;
  intro: string;
  sections: Section[];
}

const LEGAL_CONTENT: Record<LegalPageType, LegalContent> = {
  "about-us": {
    title: "About Us",
    intro:
      "Realty Dash helps real estate professionals and clients stay aligned throughout the home search and transaction lifecycle.",
    sections: [
      {
        heading: "What We Do",
        body:
          "We provide a collaborative workspace where agents can manage client profiles, track search criteria, and share listing progress in one place.",
      },
      {
        heading: "Our Focus",
        body:
          "Our platform is designed to simplify communication, reduce manual updates, and help every client receive a more personalized home search experience.",
      },
      {
        heading: "Contact",
        body:
          "For business inquiries, support, or partnership requests, please reach out through your assigned account representative or support channel.",
      },
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    intro:
      "We respect your privacy and handle personal information responsibly in connection with Realty Dash services.",
    sections: [
      {
        heading: "Information We Collect",
        body:
          "We collect account details, profile information, client-related records, and usage data necessary to provide and secure the service.",
      },
      {
        heading: "How We Use Information",
        body:
          "Collected data is used to operate the platform, provide requested features, improve reliability, and communicate service-related updates.",
      },
      {
        heading: "Data Sharing",
        body:
          "We do not sell personal information. We may share data with trusted service providers that support hosting, infrastructure, analytics, and security operations.",
      },
      {
        heading: "Your Choices",
        body:
          "You may request updates, corrections, or deletion of personal data as permitted by applicable law and contractual obligations.",
      },
    ],
  },
  "terms-of-service": {
    title: "Terms of Service",
    intro:
      "By using Realty Dash, you agree to these terms governing access to and use of the platform.",
    sections: [
      {
        heading: "Account Responsibilities",
        body:
          "You are responsible for maintaining accurate account information, safeguarding credentials, and ensuring authorized access to your account.",
      },
      {
        heading: "Acceptable Use",
        body:
          "You agree not to misuse the service, attempt unauthorized access, interfere with operations, or submit unlawful content.",
      },
      {
        heading: "Service Availability",
        body:
          "We work to maintain reliable access but do not guarantee uninterrupted service. Maintenance and updates may affect availability.",
      },
      {
        heading: "Changes to Terms",
        body:
          "We may update these terms from time to time. Continued use after changes are posted constitutes acceptance of the revised terms.",
      },
    ],
  },
  "data-policy": {
    title: "Data Policy",
    intro:
      "This policy describes how Realty Dash stores, protects, and retains operational and customer data.",
    sections: [
      {
        heading: "Data Storage",
        body:
          "Data is stored in managed infrastructure with access controls, role-based permissions, and encrypted transport.",
      },
      {
        heading: "Data Retention",
        body:
          "We retain information for as long as needed to provide services, meet contractual requirements, and comply with legal obligations.",
      },
      {
        heading: "Data Security",
        body:
          "We implement administrative, technical, and organizational safeguards intended to protect information from unauthorized access or disclosure.",
      },
      {
        heading: "Incident Response",
        body:
          "If a security incident is confirmed, we follow internal response procedures and provide required notices under applicable law.",
      },
    ],
  },
  "dmca-policy": {
    title: "DMCA Policy",
    intro:
      "Realty Dash respects intellectual property rights and responds to valid copyright claims in accordance with applicable law.",
    sections: [
      {
        heading: "Notice of Claimed Infringement",
        body:
          "To submit a copyright complaint, provide identification of the copyrighted work, the allegedly infringing material, and your contact information.",
      },
      {
        heading: "Counter-Notification",
        body:
          "If you believe material was removed in error, you may submit a counter-notification containing the legally required statements and details.",
      },
      {
        heading: "Repeat Infringer Policy",
        body:
          "Accounts repeatedly associated with substantiated infringement claims may be limited or terminated when appropriate.",
      },
    ],
  },
};

export default function LegalPage({ type }: { type: LegalPageType }) {
  const content = LEGAL_CONTENT[type];

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.hash = "#/";
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <button onClick={goBack} className="btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Building2 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-ink-900">Realty Dash</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <article className="card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-semibold text-ink-900">{content.title}</h1>
          <p className="mt-3 text-sm leading-6 text-ink-600">{content.intro}</p>

          <div className="mt-8 space-y-6">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base font-semibold text-ink-900">{section.heading}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-600">{section.body}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}
