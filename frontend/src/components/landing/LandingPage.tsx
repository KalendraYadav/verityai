import React from 'react';
import { EntityLockerLogo } from '../brand/EntityLockerLogo';
import {
  ArrowRight,
  Fingerprint,
  ShieldCheck,
  FolderUp,
  FileCheck2,
  Building,
  History,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onOpenNewApplication: () => void;
}

export const LandingPage: React.FC<Props> = ({ onGetStarted, onOpenNewApplication }) => {
  return (
    <div className="bg-[#FAF9FC] overflow-hidden">
      {/* 1. Portal Trust Header Banner (Reference 3) */}
      <div className="bg-[#171B45] text-white py-2 px-4 sm:px-8 border-b border-[#282F6B]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-[11px] gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Smart India Hackathon 2026
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Smart Automation Track · Institutional Application Validation & Digital Locker
            </span>
          </div>
          <div className="text-slate-400">
            Prototype Scrutiny System · Synthetic Data
          </div>
        </div>
      </div>

      {/* 2. Public Navigation (Reference 2) */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-[#E9E6F2] sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <EntityLockerLogo size="md" />

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#5F6485]">
            <a href="#home" className="text-[#7450D8] hover:text-[#5633B8] transition-colors">
              Home
            </a>
            <a href="#how-it-works" className="hover:text-[#171B45] transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-[#171B45] transition-colors">
              Features
            </a>
            <a href="#regulatory" className="hover:text-[#171B45] transition-colors">
              AICTE Compliance
            </a>
            <a href="#resources" className="hover:text-[#171B45] transition-colors">
              Resources
            </a>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#171B45] hover:bg-[#F3EEFC] hover:text-[#7450D8] transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* 3. Hero Section (Reference 1 & 2) */}
      <section id="home" className="relative pt-12 pb-20 px-4 sm:px-8 overflow-hidden">
        {/* Lavender Organic Background Blobs */}
        <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-gradient-to-br from-[#F3EEFC] via-[#FAF8FF] to-transparent rounded-full blur-3xl -z-10 -translate-x-1/4 -translate-y-1/4 pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#CBB3E8]/20 via-[#F3EEFC]/30 to-transparent rounded-full blur-3xl -z-10 translate-x-1/4 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline and CTAs (Reference 1 & 2) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EEFC] border border-[#DCD0F7] text-[11px] font-bold text-[#7450D8] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Secure Organizational Document Management
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#171B45] tracking-tight leading-[1.12]">
              For Entities, Organizations <br className="hidden sm:inline" />
              and <span className="text-[#7450D8]">MSMEs</span>
            </h1>

            <p className="text-sm sm:text-base text-[#5F6485] max-w-xl leading-relaxed">
              With EntityLocker, embrace the convenience and efficiency of managing your entity's critical regulatory documents in a secure, identity-ready, and AI-validated environment.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenNewApplication}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-white border border-[#DCD0F7] text-[#7450D8] hover:bg-[#FAF8FF] hover:border-[#7450D8] transition-all shadow-xs cursor-pointer"
              >
                Create Application
              </button>
            </div>

            <div className="pt-4 flex items-center gap-6 text-xs text-[#5F6485]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#12B886]" />
                <span>Deterministic Rule Checks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#12B886]" />
                <span>Traceable Evidence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#12B886]" />
                <span>Human in the Loop</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Illustration (Reference 1 & 2) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-[420px] aspect-square rounded-3xl bg-gradient-to-tr from-[#F3EEFC] to-[#FAF8FF] p-6 border border-[#DCD0F7] shadow-xl flex items-center justify-center">
              {/* Orbital Glow Ring */}
              <div className="absolute inset-4 rounded-full border border-dashed border-[#CBB3E8] animate-spin-slow opacity-60" />

              {/* Center Main Locker Folder */}
              <div className="relative z-10 w-44 h-36 bg-[#5633B8] rounded-2xl shadow-2xl p-4 flex flex-col justify-between transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[10px] font-mono text-purple-200">VERIFIED</span>
                </div>
                <div>
                  <div className="text-white font-bold text-xs">Entity Dossier</div>
                  <div className="text-purple-200 text-[10px]">AICTE Regulatory Approval</div>
                </div>
              </div>

              {/* Floating Document Badges (Reference 1 & 2) */}
              <div className="absolute top-6 right-6 z-20 bg-white rounded-xl shadow-lg border border-[#E9E6F2] p-2.5 flex items-center gap-2 transform translate-x-2 -translate-y-2">
                <div className="w-7 h-7 rounded-lg bg-[#FFF0EF] text-[#F04438] flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-[#171B45]">EoA_Approval.pdf</div>
                  <div className="text-[9px] text-[#12B886] font-semibold">100% Validated</div>
                </div>
              </div>

              <div className="absolute bottom-8 left-4 z-20 bg-white rounded-xl shadow-lg border border-[#E9E6F2] p-2.5 flex items-center gap-2 transform -translate-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-[#171B45]">Tamper Protection</div>
                  <div className="text-[9px] text-[#5F6485]">SHA-256 Certified</div>
                </div>
              </div>

              <div className="absolute top-1/2 -right-4 z-20 bg-white rounded-xl shadow-md border border-[#E9E6F2] p-2 flex items-center gap-1.5 text-[11px] font-bold text-[#171B45]">
                <Building className="w-3.5 h-3.5 text-[#F04438]" />
                <span>Apex Institute</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section (Reference 2) */}
      <section id="how-it-works" className="py-20 px-4 sm:px-8 bg-white border-y border-[#E9E6F2]">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <div>
            <div className="text-xs font-bold text-[#7450D8] uppercase tracking-wider mb-2">
              Simple 3-Step Process
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#171B45]">
              How It Works?
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6485] max-w-lg mx-auto mt-2">
              From application drafting to document validation and human scrutiny decisions.
            </p>
          </div>

          {/* 3 Step Connected Cards (Reference 2) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-[#FAF9FC] border border-[#E9E6F2] hover:border-[#DCD0F7] transition-all shadow-xs">
              <div className="w-16 h-16 rounded-full bg-white shadow-md border border-[#E9E6F2] flex items-center justify-center text-[#F04438]">
                <Fingerprint className="w-8 h-8" />
              </div>
              <div className="text-xs font-bold text-[#7450D8] uppercase tracking-wider">Step 01</div>
              <h3 className="text-sm font-bold text-[#171B45]">Authenticate yourself and your Entity</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Registered institutional representatives access their tenancy through secure credentials.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-[#FAF9FC] border border-[#E9E6F2] hover:border-[#DCD0F7] transition-all shadow-xs">
              <div className="w-16 h-16 rounded-full bg-white shadow-md border border-[#E9E6F2] flex items-center justify-center text-[#7450D8]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="text-xs font-bold text-[#7450D8] uppercase tracking-wider">Step 02</div>
              <h3 className="text-sm font-bold text-[#171B45]">Secure and encrypted workspace setup</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Draft regulatory applications, declare institutional metrics, and upload certificates safely.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-[#FAF9FC] border border-[#E9E6F2] hover:border-[#DCD0F7] transition-all shadow-xs">
              <div className="w-16 h-16 rounded-full bg-white shadow-md border border-[#E9E6F2] flex items-center justify-center text-[#7450D8]">
                <FolderUp className="w-8 h-8" />
              </div>
              <div className="text-xs font-bold text-[#7450D8] uppercase tracking-wider">Step 03</div>
              <h3 className="text-sm font-bold text-[#171B45]">Store and access documents</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Evidence-linked validation checks assist scrutiny officials with automated compliance indicators.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 rounded-xl text-sm font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all shadow-md cursor-pointer"
            >
              Sign Up Now
            </button>
          </div>
        </div>
      </section>

      {/* 5. Key Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171B45]">
              Engineered for Institutional Scrutiny
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6485] max-w-lg mx-auto">
              VerityAI decision-support technology embedded inside a modern document repository.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E9E6F2] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center font-bold">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#171B45]">Automated Validation</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Deterministic date checks, identifier reconciliation, and document requirement verification.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E6F2] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF0EF] text-[#F04438] flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#171B45]">Entity Isolation</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Strict multi-tenancy preventing unauthorized cross-institution disclosures or data access.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E6F2] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center font-bold">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#171B45]">Immutable Audit Logs</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Every application change, document upload, and reviewer note produces append-only audit events.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E9E6F2] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6F4F2] text-[#12B886] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#171B45]">Evidence Traceability</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Every finding links to exact documents, extracted values, and statutory rule definitions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
