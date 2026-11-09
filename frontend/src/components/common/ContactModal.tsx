import React, { useEffect } from "react";
import { ArrowUpRight, Mail, Sparkles, X } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Pixel-perfect SVG brand icons for Instagram, LinkedIn, and GitHub
const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.37 9.74V9.93H5.09v8.57h2.74z" />
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-emerald-900/10 overflow-hidden z-10 animate-zoom-in">
        {/* Soft Ambient Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-emerald-100/60 via-teal-50/40 to-transparent pointer-events-none -z-10" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0A5C4D] flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4 text-[#0A5C4D]" />
            </div>
            <div>
              <h2
                id="contact-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
              >
                Contact
              </h2>
              <p className="text-xs text-slate-500">Connect with the creator & get support</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close contact modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Card 1: Creator Section */}
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-emerald-50/30 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Creator Avatar Badge */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0A5C4D] to-teal-500 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm ring-2 ring-emerald-200/80">
                <span>JV</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Jaya Chandra Vennam
                  </h3>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <p className="text-xs font-medium text-emerald-800/80">
                  Creator & Lead Developer of PennyPilot
                </p>
              </div>
            </div>

            {/* Social Profile Icon Links */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0 self-end sm:self-center">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/jaya_chandra_v?stkn=Mm1remxkbmtja2pl"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white border border-emerald-200/90 hover:border-emerald-500 hover:bg-emerald-50/60 text-slate-700 hover:text-emerald-900 flex items-center justify-center shadow-xs transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                aria-label="Jaya Chandra Vennam on Instagram"
                title="Instagram Profile"
              >
                <InstagramIcon className="w-4 h-4 text-pink-600" />
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/jaya-chandra-vennam/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white border border-emerald-200/90 hover:border-emerald-500 hover:bg-emerald-50/60 text-slate-700 hover:text-emerald-900 flex items-center justify-center shadow-xs transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                aria-label="Jaya Chandra Vennam on LinkedIn"
                title="LinkedIn Profile"
              >
                <LinkedInIcon className="w-4 h-4 text-[#0A66C2]" />
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/jayachandra2003"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white border border-emerald-200/90 hover:border-emerald-500 hover:bg-emerald-50/60 text-slate-700 hover:text-emerald-900 flex items-center justify-center shadow-xs transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                aria-label="Jaya Chandra Vennam on GitHub"
                title="GitHub Profile"
              >
                <GitHubIcon className="w-4 h-4 text-slate-900" />
              </a>
            </div>
          </div>

          {/* Card 2: Support Email Section */}
          <a
            href="mailto:pennypilotcontact@gmail.com"
            className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-300 transition-all duration-150 shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100/70 text-[#0A5C4D] flex items-center justify-center shrink-0 group-hover:bg-emerald-200/70 group-hover:scale-105 transition-all">
                <Mail className="w-5 h-5 text-[#0A5C4D]" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-slate-500 group-hover:text-[#0A5C4D] transition-colors">
                  Email Support
                </p>
                <p className="text-sm font-semibold text-slate-900 font-mono tracking-tight mt-0.5">
                  pennypilotcontact@gmail.com
                </p>
              </div>
            </div>
            <div className="p-2 rounded-xl text-slate-400 group-hover:text-[#0A5C4D] group-hover:bg-emerald-100/60 transition-all">
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </a>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs text-slate-500 font-medium">
            PennyPilot © 2026 • Built by{" "}
            <span className="text-slate-700 font-semibold">Jaya Chandra Vennam</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
