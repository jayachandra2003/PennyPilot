import React, { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileSpreadsheet,
  FileText,
  Lock,
  Menu,
  Scan,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  X,
  Zap,
} from "lucide-react";
import { PennyPilotLogo } from "../common/PennyPilotLogo";

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenLegal?: (doc: "privacy" | "terms" | "security") => void;
  onOpenContact?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenLegal,
  onOpenContact,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-slate-900 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-900 relative overflow-x-hidden">
      {/* =========================================================================
          AMBIENT BACKGROUND LIGHTING (Soft Cream, Pale Mint, Subtle Teal Gradients)
         ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        {/* Top Hero Ambient Glow: Mint & Soft Warm Cream */}
        <div className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[1400px] h-[900px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/50 via-[#FAF7F0]/70 to-transparent blur-3xl opacity-90" />

        {/* Hero Top-Left Mint Pool */}
        <div className="absolute top-[160px] -left-[140px] w-[560px] h-[560px] bg-gradient-to-br from-emerald-200/35 via-teal-100/25 to-transparent blur-3xl rounded-full" />

        {/* Hero Top-Right Warm Cream & Teal Pool */}
        <div className="absolute top-[100px] -right-[120px] w-[620px] h-[620px] bg-gradient-to-bl from-amber-100/40 via-emerald-100/30 to-transparent blur-3xl rounded-full" />

        {/* Subtle Topographical Abstract Wave Lines */}
        <svg
          className="absolute top-[60px] left-0 right-0 w-full h-[650px] opacity-35"
          viewBox="0 0 1440 650"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-80 240 C280 140 580 380 980 250 C1280 150 1480 290 1580 230"
            stroke="url(#ambient-wave-1)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <path
            d="M-80 320 C240 220 640 460 1040 330 C1340 230 1540 350 1580 310"
            stroke="url(#ambient-wave-2)"
            strokeWidth="1.2"
          />
          <path
            d="M-80 400 C340 320 740 520 1140 410 C1380 330 1560 430 1580 390"
            stroke="url(#ambient-wave-1)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
          <defs>
            <linearGradient id="ambient-wave-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#0D9488" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="ambient-wave-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>

        {/* Middle Page Ambient Lighting: Why PennyPilot & How It Works */}
        <div className="absolute top-[1350px] -left-[180px] w-[650px] h-[650px] bg-gradient-to-tr from-teal-100/30 via-emerald-100/20 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-[1750px] -right-[160px] w-[700px] h-[700px] bg-gradient-to-bl from-amber-50/45 via-emerald-100/25 to-transparent blur-3xl rounded-full" />

        {/* Lower Page Ambient Lighting: AI Copilot & Security */}
        <div className="absolute top-[2600px] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-50/60 via-emerald-50/30 to-transparent blur-3xl" />
        <div className="absolute bottom-[400px] -left-[120px] w-[600px] h-[600px] bg-emerald-100/30 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[850px] h-[650px] bg-gradient-to-tl from-emerald-100/40 via-teal-50/30 to-transparent blur-3xl" />
      </div>

      {/* =========================================================================
          1. HEADER & NAVIGATION BAR
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-900/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-3 group focus-ring rounded-xl select-none"
              aria-label="PennyPilot home"
            >
              <PennyPilotLogo variant="symbol" size="md" />
              <div className="flex items-baseline gap-2">
                <span className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-slate-900">
                  PennyPilot
                </span>
                <span className="hidden md:inline-block text-xs font-medium text-emerald-800/70 border-l border-slate-300 pl-2">
                  AI-Powered Personal Finance
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("security")}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Security
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              About
            </button>
            {onOpenContact && (
              <button
                type="button"
                onClick={onOpenContact}
                className="hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Contact
              </button>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/70 rounded-xl transition-all cursor-pointer"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0A5C4D] hover:bg-[#07473B] active:scale-[0.98] rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0A5C4D] rounded-lg shadow-xs"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-emerald-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200/90 bg-white/95 backdrop-blur-lg px-5 py-5 space-y-4 shadow-lg animate-fade-in">
            <nav className="flex flex-col space-y-3 text-base font-medium text-slate-700">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-left py-1 hover:text-emerald-800"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="text-left py-1 hover:text-emerald-800"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("how-it-works")}
                className="text-left py-1 hover:text-emerald-800"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("security")}
                className="text-left py-1 hover:text-emerald-800"
              >
                Security
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("about")}
                className="text-left py-1 hover:text-emerald-800"
              >
                About
              </button>
              {onOpenContact && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenContact();
                  }}
                  className="text-left py-1 hover:text-emerald-800"
                >
                  Contact
                </button>
              )}
            </nav>
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 text-center text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegister();
                }}
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-[#0A5C4D] rounded-xl shadow-xs"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION (Headline, Copy, CTAs & Premium Receipt Scanning Station)
         ========================================================================= */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Copy Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/90 text-emerald-800 text-xs font-semibold tracking-wide shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Your Smart Finance Companion</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-bold text-slate-900 tracking-tight leading-[1.15]">
                Track Expenses, Scan Receipts and Get{" "}
                <span className="text-[#0A5C4D]">AI Financial Insights</span> with PennyPilot
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                A simple and intelligent way to manage your money, analyze spending, and make better financial decisions with one unified personal finance platform.
              </p>

              {/* Primary Call to Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-white bg-[#0A5C4D] hover:bg-[#07473B] active:scale-[0.98] rounded-xl shadow-[0_4px_14px_rgba(10,92,77,0.25)] hover:shadow-[0_6px_20px_rgba(10,92,77,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-slate-700 hover:text-emerald-800 bg-white/95 hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  Sign In
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-7 pt-4 text-xs sm:text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Free to Use</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Privacy First</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>AI-Powered Insights</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Column (5 cols) - Premium Finance Receipt Scanning Station */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-[420px] sm:max-w-[460px]">
                {/* Viewport Scanning Station Frame */}
                <div className="relative rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-700/15 p-5 sm:p-6 border-2 border-emerald-400/40 shadow-[0_24px_50px_-12px_rgba(10,92,77,0.22)] backdrop-blur-md">
                  {/* Viewfinder Corner Accents */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#0A5C4D] rounded-tl-sm" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#0A5C4D] rounded-tr-sm" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#0A5C4D] rounded-bl-sm" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#0A5C4D] rounded-br-sm" />

                  {/* Optical Lens Calibration Tick Marks on Left & Right */}
                  <div className="hidden sm:flex flex-col justify-between absolute top-12 bottom-12 -left-2.5 w-1 text-[8px] font-mono text-emerald-700/60 select-none">
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                  <div className="hidden sm:flex flex-col justify-between absolute top-12 bottom-12 -right-2.5 w-1 text-[8px] font-mono text-emerald-700/60 select-none">
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </div>

                  {/* Realistic Thermal Paper Receipt */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_12px_32px_rgba(15,23,42,0.12)] relative overflow-hidden">
                    {/* Active Laser Scanning Beam & Dual-Sided Light Fan */}
                    <div className="absolute left-0 right-0 top-[52%] -translate-y-1/2 pointer-events-none z-20">
                      {/* Laser Light Fan (Translucent emerald shimmer) */}
                      <div className="h-10 bg-gradient-to-t from-emerald-400/25 to-transparent w-full" />
                      {/* Glowing Laser Beam */}
                      <div className="h-[2.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_#10B981,0_0_28px_#34D399] w-full" />
                    </div>

                    <div className="space-y-3">
                      {/* Receipt Header */}
                      <div className="text-center border-b border-dashed border-slate-300 pb-2.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                          RECEIPT #PP-9021
                        </span>
                        <div className="mt-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                            CAFE AROMA ROASTERS
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            12 Green Glen Layout, Bengaluru • GSTIN: 29AAFCP1234F1Z8
                          </p>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                            <span>10 Nov 2026, 13:45</span>
                            <span className="font-mono text-slate-500">POS-02</span>
                          </div>
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-800">1x Artisanal Cold Brew</span>
                          <span className="font-mono text-slate-800">₹220.00</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-800">1x Almond Croissant</span>
                          <span className="font-mono text-slate-800">₹150.00</span>
                        </div>
                        <div className="pt-1 border-t border-slate-100 space-y-0.5 text-[11px] text-slate-400">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="font-mono">₹370.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CGST (2.5%) + SGST (2.5%)</span>
                            <span className="font-mono">₹18.50</span>
                          </div>
                        </div>
                      </div>

                      {/* Final Total Bar */}
                      <div className="pt-2 border-t-2 border-dashed border-slate-300 flex items-center justify-between text-sm font-bold text-slate-900">
                        <span className="tracking-tight uppercase text-xs text-slate-700">Total Paid</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-emerald-700 text-lg sm:text-xl font-extrabold tracking-tight">
                            ₹388.50
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Camera Shutter Trigger */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>OCR Engine Active</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#0A5C4D] text-white flex items-center justify-center shadow-xs">
                        <Scan className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Intelligence Card 1: OCR Extraction Result (Top-Right) */}
                <div className="hidden sm:flex items-center gap-3 absolute -top-5 -right-6 z-30 bg-white/95 rounded-2xl p-3 border border-emerald-200/90 shadow-[0_12px_30px_rgba(15,118,110,0.12)] backdrop-blur-md">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0A5C4D] flex items-center justify-center shrink-0">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                        OCR Extracted
                      </span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">Cafe Aroma • ₹388.50</p>
                  </div>
                </div>

                {/* Floating Intelligence Card 2: Category & Matching (Bottom-Right) */}
                <div className="hidden sm:flex items-center gap-3 absolute -bottom-5 -right-6 z-30 bg-white/95 rounded-2xl p-3 border border-teal-200/90 shadow-[0_12px_30px_rgba(13,148,136,0.12)] backdrop-blur-md">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700">
                        Category Suggested
                      </span>
                      <span className="px-1.5 py-0.2 bg-teal-50 text-[9px] font-bold text-teal-800 rounded">
                        100% Match
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">Dining & Cafes</p>
                  </div>
                </div>

                {/* Floating Intelligence Card 3: Integer Precision Storage (Bottom-Left) */}
                <div className="hidden sm:flex items-center gap-3 absolute -bottom-5 -left-6 z-30 bg-white/95 rounded-2xl p-3 border border-emerald-200/90 shadow-[0_12px_30px_rgba(15,118,110,0.12)] backdrop-blur-md">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0A5C4D] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                      Zero Rounding Loss
                    </span>
                    <p className="text-xs font-mono font-bold text-slate-900">38,850 Paise Saved</p>
                  </div>
                </div>

                {/* Mobile Workflow Strip (Shown on screens < 640px) */}
                <div className="flex sm:hidden flex-col gap-2 mt-4">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/90 border border-emerald-200 shadow-2xs text-xs font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 text-emerald-600" />
                      <span>Extracted: Cafe Aroma</span>
                    </div>
                    <span className="font-mono text-emerald-700 font-bold">₹388.50</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/90 border border-teal-200 shadow-2xs text-xs font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-teal-600" />
                      <span>Category: Dining & Cafes</span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                      100% Match
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. FEATURE HIGHLIGHTS BANNER BAR
         ========================================================================= */}
      <section id="features" className="py-6 sm:py-8 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-emerald-900/10 shadow-[0_10px_30px_rgba(15,118,110,0.06)] p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Item 1 */}
              <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3 first:pt-0 first:px-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-[#0A5C4D] flex items-center justify-center shrink-0 shadow-2xs">
                  <BarChart3 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Expense Tracking</h3>
                  <p className="text-xs text-slate-500">Keep complete control of your spending</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Scan className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Receipt Scanning</h3>
                  <p className="text-xs text-slate-500">Capture receipts & auto-extract details</p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100/80 text-sky-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5 text-sky-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Copilot</h3>
                  <p className="text-xs text-slate-500">Ask questions & get personalized insights</p>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Financial Reports</h3>
                  <p className="text-xs text-slate-500">Download professional monthly reports</p>
                </div>
              </div>

              {/* Item 5 */}
              <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Secure & Private</h3>
                  <p className="text-xs text-slate-500">Your data stays safe and under your control</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. WHY PENNYPILOT? 4-CARD VALUE PROPOSITION GRID
         ========================================================================= */}
      <section className="py-20 bg-gradient-to-b from-[#F7FAF8]/80 via-[#FAF9F5]/70 to-[#F2F8F5]/80 border-t border-emerald-950/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Why PennyPilot?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Everything you need for smarter, simpler and more insightful money management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 sm:mt-16">
            {/* Card 1 */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] hover:shadow-[0_8px_30px_rgba(15,118,110,0.1)] transition-all space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shadow-2xs">
                <Zap className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">All-in-One Finance Tool</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track expenses, manage budgets, analyze spending and more in one unified platform designed for daily use.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] hover:shadow-[0_8px_30px_rgba(15,118,110,0.1)] transition-all space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center shadow-2xs">
                <Cpu className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI-Powered Assistance</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ask financial questions, get insights, and understand your spending better without complex financial jargon.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] hover:shadow-[0_8px_30px_rgba(15,118,110,0.1)] transition-all space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-100/80 text-sky-800 flex items-center justify-center shadow-2xs">
                <FileSpreadsheet className="w-5 h-5 text-sky-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Professional Reports</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generate and download detailed monthly financial statements in PDF, DOCX, and CSV formats instantly.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] hover:shadow-[0_8px_30px_rgba(15,118,110,0.1)] transition-all space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-100/80 text-purple-800 flex items-center justify-center shadow-2xs">
                <Smartphone className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Works Everywhere</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A responsive progressive web app that works cleanly across desktop, tablet, and mobile devices in light or dark mode.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. HOW IT WORKS: 3-STEP INTUITIVE WORKFLOW
         ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-[#F2F8F5]/80 via-white/70 to-[#FAF9F5]/80 border-t border-emerald-950/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full shadow-2xs">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Three Simple Steps to Financial Peace of Mind
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              PennyPilot streamlines money tracking so you can focus on reaching your financial goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 sm:mt-16">
            {/* Step 1 */}
            <div className="relative p-6 sm:p-8 rounded-3xl bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-[#0A5C4D] flex items-center justify-center font-bold text-lg shadow-2xs">
                  1
                </div>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Step 01
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Add or Scan Transactions</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Snap photos of paper receipts or enter transactions manually. Our OCR engine accurately extracts the merchant, date, and final total.
              </p>
              <ul className="space-y-2 pt-2 text-xs font-medium text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Indian GST & tax parsing support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fast, privacy-focused local processing</span>
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 sm:p-8 rounded-3xl bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center font-bold text-lg shadow-2xs">
                  2
                </div>
                <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full">
                  Step 02
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Organize & Set Budgets</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Group your spending into customizable categories with tailored spending limits. Monitor real-time progress indicators before you overspend.
              </p>
              <ul className="space-y-2 pt-2 text-xs font-medium text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>Interactive budget envelope trackers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>Proactive anomaly & overspend warnings</span>
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 sm:p-8 rounded-3xl bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-100/80 text-sky-800 flex items-center justify-center font-bold text-lg shadow-2xs">
                  3
                </div>
                <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full">
                  Step 03
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Review & Gain Clarity</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Consult your AI Financial Copilot for grounded breakdowns of your cash flow, net savings, and spending habits over time.
              </p>
              <ul className="space-y-2 pt-2 text-xs font-medium text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-sky-600" />
                  <span>Zero hallucination: answers strictly from your ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-sky-600" />
                  <span>One-click PDF & DOCX export</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. FINANCIAL CLARITY & INTEGER PRECISION SECTION
         ========================================================================= */}
      <section className="py-20 bg-gradient-to-b from-[#FAF9F5]/80 via-white/80 to-[#EDF7F4]/80 border-t border-emerald-950/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full shadow-2xs">
                Zero-Rounding Architecture
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Financial Math Done Right: Pure Integer Precision
              </h2>
              <p className="text-base text-slate-600 leading-relaxed font-normal">
                Most personal finance apps use standard floating-point numbers, leading to subtle fractional-cent rounding errors over time. PennyPilot stores every transaction in exact minor units (paise / cents), guaranteeing 100% mathematical accuracy across all balances, budgets, and statements.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Traditional Apps</p>
                  <p className="text-base font-bold text-rose-600 mt-1">₹0.1 + ₹0.2 = ₹0.30000000000000004</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Floating-point drift accumulates</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 shadow-2xs">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">PennyPilot Precision</p>
                  <p className="text-base font-bold text-emerald-800 mt-1">10p + 20p = 30 paise</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Exact integer arithmetic</p>
                </div>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-[0_10px_35px_rgba(15,118,110,0.06)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="font-bold text-slate-900 text-sm">Ledger Mathematical Integrity</span>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Verified
                </span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-medium text-slate-700">Storage Unit</span>
                  <span className="font-mono font-bold text-slate-900">Signed 64-bit Integer (Paise)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-medium text-slate-700">Accumulation Error</span>
                  <span className="font-mono font-bold text-emerald-700">0.0000%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-medium text-slate-700">Reconciliation Speed</span>
                  <span className="font-mono font-bold text-slate-900">&lt; 1 millisecond</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium text-slate-700">Multi-Currency Ready</span>
                  <span className="font-mono font-bold text-slate-900">INR (₹), USD ($), EUR (€), GBP (£)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. AI COPILOT SECTION: GROUNDED CONTEXTUAL INTELLIGENCE
         ========================================================================= */}
      <section className="py-20 bg-gradient-to-b from-[#EDF7F4]/80 via-[#FAF9F5]/70 to-[#F4F9F6]/80 border-t border-emerald-950/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual Chat Mockup */}
            <div className="order-2 lg:order-1 p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_12px_40px_rgba(15,118,110,0.08)] space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0A5C4D] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-[#0A5C4D]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">PennyPilot Financial Copilot</h4>
                  <p className="text-[11px] text-emerald-700">Grounded with your deterministic ledger</p>
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="space-y-3 pt-2 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-800 ml-auto max-w-[85%] font-medium">
                  "How much did I spend on dining out this month compared to last month?"
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-950 mr-auto max-w-[90%] border border-emerald-100 space-y-2">
                  <p>
                    In November 2026, you spent <strong>₹4,250</strong> across 8 transactions in Dining & Food. That is <strong>14.2% lower</strong> than October (₹4,950).
                  </p>
                  <div className="text-[11px] text-emerald-800/80 pt-1 border-t border-emerald-200/50 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Calculated strictly from 8 verified ledger rows</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy Column */}
            <div className="order-1 lg:order-2 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full shadow-2xs">
                Contextual AI
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Ask Questions in Plain English. Get Verified Financial Answers.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed font-normal">
                Unlike generic chatbots that guess, PennyPilot’s AI Copilot operates directly on your verified financial ledger. Every summary, trend, and recommendation is calculated with precision before being summarized.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <p className="text-sm text-slate-700">
                    <strong>Zero hallucination:</strong> Cannot invent transactions or modify records without confirmation.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <p className="text-sm text-slate-700">
                    <strong>Context-aware insights:</strong> Identifies unusual price increases, duplicate charges, and subscription drift.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. PRIVACY AND SECURITY SECTION
         ========================================================================= */}
      <section id="security" className="py-20 bg-gradient-to-b from-[#F4F9F6]/80 via-white/80 to-[#FAF9F5]/70 border-t border-emerald-950/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              Trust & Governance
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Privacy and Security by Architecture
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Your financial records belong to you alone. We practice strict multi-tenant isolation and data protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 mt-12 sm:mt-16">
            {/* Feature 1 */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] space-y-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
                <Shield className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Tenant Isolation</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every query, budget calculation, and receipt upload is strictly verified against your authenticated account ID.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] space-y-3.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-2xs">
                <Lock className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">CSRF & Session Protection</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Mutating requests require cryptographic double-submit HMAC tokens and strict origin allowlist validation.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(15,118,110,0.05)] space-y-3.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-sky-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">User Data Ownership</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Export your ledger data anytime or permanently delete your account with a complete 12-table cascading purge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. ABOUT SECTION
         ========================================================================= */}
      <section id="about" className="py-16 bg-gradient-to-b from-[#FAF9F5]/70 via-[#EDF7F4]/60 to-[#F2F8F5]/80 border-t border-emerald-950/[0.05]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full shadow-2xs">
            About the Project
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Designed for Personal Financial Freedom
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            PennyPilot was engineered as an AI-powered financial intelligence platform that pairs zero-rounding ledger mathematics with grounded contextual AI assistance, making financial clarity accessible to everyone.
          </p>
          {onOpenContact && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenContact}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 cursor-pointer"
              >
                <span>Learn more about the creator & connect</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          10. FINAL CALL TO ACTION BANNER
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-[#F2F8F5]/80 via-emerald-50/70 to-teal-50/60 border-t border-emerald-950/[0.08]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Make Every Financial Decision Count.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Start understanding your money with PennyPilot today.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-8 py-3.5 text-base font-semibold text-white bg-[#0A5C4D] hover:bg-[#07473B] active:scale-[0.98] rounded-xl shadow-[0_4px_16px_rgba(10,92,77,0.25)] hover:shadow-[0_6px_22px_rgba(10,92,77,0.35)] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. MINIMAL HORIZONTAL FOOTER (Brand, Legal, Contact & Creator Credit)
         ========================================================================= */}
      <footer className="border-t border-emerald-950/[0.08] bg-white/80 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5">
            <PennyPilotLogo variant="symbol" size="xs" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">PennyPilot</span>
          </div>

          {/* Center: Legal and Contact Navigation */}
          <nav
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 font-medium text-slate-600"
            aria-label="Footer navigation links"
          >
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal("privacy")}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true" className="text-slate-300">
              •
            </span>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal("terms")}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span aria-hidden="true" className="text-slate-300">
              •
            </span>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal("security")}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Security Standards
            </button>
            {onOpenContact && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  •
                </span>
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </>
            )}
          </nav>

          {/* Right: Copyright & Creator Credit */}
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-slate-600">
            <span>© 2026 PennyPilot</span>
            <span aria-hidden="true" className="hidden sm:inline text-slate-300">
              •
            </span>
            <span className="text-slate-500">
              Built by{" "}
              <span className="font-semibold text-slate-700">Jaya Chandra Vennam</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
