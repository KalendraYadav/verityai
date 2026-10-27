import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  FileSearch,
  ClipboardList,
  FileText,
  AlertTriangle,
  History,
  UploadCloud,
  Layers,
  Building2,
} from 'lucide-react';
import type { UserProfile } from '../../api/client';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
  onOfficerSignIn?: () => void;
  onOpenApplicantPortal?: () => void;
  onEnterWorkspace?: () => void;
  currentUser?: UserProfile | null;
}

/* ── 4-Step Scrutiny Workflow (Adapted from Linea) ────────────────────────── */
const WORKFLOW_STEPS = [
  {
    step: '01',
    name: 'Submit',
    title: 'Institutional Intake & Dossier Upload',
    description:
      'Institutions prepare, document, and submit statutory approval dossiers with declared campus metrics and mandatory certificate attachments under AICTE APH 2024–27 norms.',
    tag: 'Step 01 · Intake',
    icon: UploadCloud,
  },
  {
    step: '02',
    name: 'Extract',
    title: 'Document Intelligence & RapidOCR',
    description:
      'Structured text extraction parses multilingual and Devanagari numerals. Page-level confidence, bounding boxes, and parsing integrity are preserved without cloud token dependencies.',
    tag: 'Step 02 · Provenance',
    icon: FileSearch,
  },
  {
    step: '03',
    name: 'Validate',
    title: 'Deterministic Norm Verification',
    description:
      'Zero-hallucination compliance rules verify contiguous land area, faculty cadres, structural stability, and approved intake ceilings against statutory baselines.',
    tag: 'Step 03 · Validation',
    icon: Layers,
  },
  {
    step: '04',
    name: 'Review',
    title: 'Human Officer Determination & Audit',
    description:
      'Authorized scrutiny officers inspect evidence-linked findings, record formal determinations, and export tamper-evident reports sealed in an immutable cryptographic audit trail.',
    tag: 'Step 04 · Decision',
    icon: ClipboardList,
  },
];

/* ── 6 Core Scrutiny Capabilities ─────────────────────────────────────────── */
const CAPABILITIES = [
  {
    icon: FileText,
    title: 'Document Ingestion & OCR',
    category: 'Ingestion & Extraction',
    body: 'Structured intake, multi-format validation, and automated text extraction with per-document status tracking across PDF and scanned filings.',
    pill: 'Offline OCR Engine',
  },
  {
    icon: ShieldCheck,
    title: 'Deterministic Validation',
    category: 'Statutory Criteria',
    body: 'Rigid compliance algorithms enforce contiguous land norms, faculty-to-student ratios (FSR), building age limits, and validity periods without LLM guesswork.',
    pill: 'Zero Hallucination',
  },
  {
    icon: AlertTriangle,
    title: 'Discrepancy Detection',
    category: 'Cross-Document Checking',
    body: 'Rule-based cross-document comparison identifying conflicting declarations between titles, disclosures, and institutional registrations.',
    pill: 'Anomaly Detection',
  },
  {
    icon: FileSearch,
    title: 'Evidence-Linked Review',
    category: 'Full Provenance',
    body: 'Every finding cites the exact source document, page number, candidate extracted value, and governing evaluation rule for transparent scrutiny.',
    pill: 'Traceable Findings',
  },
  {
    icon: History,
    title: 'Append-Only Audit Trail',
    category: 'Legal Accountability',
    body: 'Cryptographically sealed chronological audit logging recording every document upload, evaluation run, and reviewer action with SHA-256 integrity.',
    pill: 'Tamper-Evident',
  },
  {
    icon: ClipboardList,
    title: 'Statutory Scrutiny Reports',
    category: 'Board Reporting',
    body: 'Comprehensive, structured scrutiny summaries compiling document statuses, validation results, and reviewer determinations for committee adjudication.',
    pill: 'Official Dossier',
  },
];

export const LandingPage: React.FC<Props> = ({
  onGetStarted,
  onSignIn,
  onOfficerSignIn,
  onOpenApplicantPortal,
  onEnterWorkspace,
  currentUser,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF5F0] text-[#1B1411] font-sans antialiased relative selection:bg-[#33CC7A] selection:text-[#1B1411]">
      {/* ── Accessible Skip to Main Content Link ── */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Linea Floating Pill Navigation Bar ── */}
      <header className="sticky top-4 z-50 px-4 sm:px-6 pointer-events-none mb-4">
        <nav
          aria-label="Primary Navigation"
          className="max-w-5xl mx-auto linea-nav-pill px-5 sm:px-7 py-3 flex items-center justify-between pointer-events-auto transition-all shadow-[0_8px_32px_rgba(27,20,17,0.18)]"
        >
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#33CC7A] flex items-center justify-center text-[#1B1411] font-bold text-sm shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-bold text-lg tracking-tight">VerityAI</span>
            </div>
          </div>

          {/* Center Links */}
          <ul className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#BACDE0]">
            <li>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How It Works
              </a>
            </li>
            <li>
              <a href="#comparison" className="hover:text-white transition-colors">
                Dual Verification
              </a>
            </li>
            <li>
              <a href="#capabilities" className="hover:text-white transition-colors">
                Capabilities
              </a>
            </li>
            <li>
              <a href="#governance" className="hover:text-white transition-colors">
                Governance
              </a>
            </li>
          </ul>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={onEnterWorkspace || onGetStarted}
                className="linea-btn-mint px-5 py-2 text-xs font-semibold"
              >
                Enter Workspace →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="hidden sm:inline-flex text-[#FAF5F0] hover:text-white text-xs font-semibold px-3 py-1.5 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={onOpenApplicantPortal || onGetStarted}
                  className="linea-btn-mint px-4.5 py-2 text-xs font-semibold cursor-pointer"
                >
                  Applicant Portal
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Main Content Area ── */}
      <main id="main-content">
        {/* ── SECTION 1: Linea Hero Showcase ─────────────────────────────── */}
        <section
          id="hero"
          className="relative bg-[#1F3954] text-[#FAF5F0] pt-24 pb-28 sm:pt-32 sm:pb-36 px-6 sm:px-12 overflow-hidden border-b border-[#FAF5F0]/10"
        >
          {/* Subtle Ambient Grain (no artificial scribbles) */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#BACDE0_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-7">
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF5F0]/10 border border-[#FAF5F0]/15 text-[#BACDE0] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#33CC7A]" />
              <span>AICTE Approval Process Handbook (APH 2024–27) Baseline</span>
            </div>

            {/* Massive Clear Linea Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.04em] leading-[1.02] text-[#FAF5F0]">
              Every statutory filing, <br />
              <span className="text-[#33CC7A]">verified to its source.</span>
            </h1>

            {/* Editorial Lead Paragraph - Short, focused, confident */}
            <p className="text-base sm:text-lg text-[#BACDE0] max-w-2xl mx-auto leading-relaxed font-normal">
              Intelligent intake, deterministic norm validation, and evidence-traceable scrutiny
              for institutional applications—built for technical education regulators and applicants.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onOpenApplicantPortal || onGetStarted}
                className="linea-btn-mint px-7 py-3.5 text-sm font-bold gap-2 cursor-pointer shadow-[0_4px_20px_rgba(51,204,122,0.3)]"
              >
                <Building2 className="size-4" />
                Applicant Portal
                <ArrowRight className="size-4" />
              </button>

              <button
                type="button"
                onClick={onOfficerSignIn || onSignIn}
                className="linea-btn-sand px-6 py-3.5 text-sm font-semibold gap-2 cursor-pointer hover:bg-white text-[#1B1411]"
              >
                Officer Sign In
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Dual Verification ("They Declare" vs "We Verify") ── */}
        <section id="comparison" className="py-20 sm:py-28 px-6 sm:px-12 bg-[#FAF5F0]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
              <div className="lg:col-span-7">
                <p className="text-xs font-semibold text-[#66574F] uppercase tracking-wider mb-2">
                  Transparent Scrutiny Architecture
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1B1411] leading-[1.05]">
                  Nothing lost between <br />
                  a declaration and an audit.
                </h2>
              </div>
              <div className="lg:col-span-5">
                <p className="text-sm sm:text-base text-[#66574F] leading-relaxed">
                  No gaps, no guesswork, and zero unverified assumptions. VerityAI operates as
                  an evidence-traceable bridge: institutions submit declared parameters, and
                  deterministic rules extract, evaluate, and trace every claim to exact PDF character spans.
                </p>
              </div>
            </div>

            {/* The Signature Dual Blocks (Refined & Balanced) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Left: Applicant Declares (Deep Espresso) */}
              <div className="bg-[#1B1411] text-[#FAF5F0] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-lg border border-[#2E241F]">
                <div>
                  <div className="flex items-center justify-between pb-5 border-b border-[#FAF5F0]/10 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#B8ABA3]" />
                      <span className="text-xs font-bold text-[#FAF5F0] tracking-wider uppercase">
                        Applicant Submission
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#BACDE0]">
                      DECLARED DOSSIER
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-[#2A201B] border border-[#FAF5F0]/10">
                      <p className="text-[10px] text-[#B8ABA3] uppercase font-bold tracking-wider mb-0.5">
                        Institution Legal Title
                      </p>
                      <p className="text-sm font-semibold text-white">
                        Apex Institute of Technology &amp; Management
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#2A201B] border border-[#FAF5F0]/10">
                      <p className="text-[10px] text-[#B8ABA3] uppercase font-bold tracking-wider mb-0.5">
                        Declared Campus Land
                      </p>
                      <p className="text-sm font-semibold text-white">
                        7.42 Contiguous Acres (Rural / Mega City Zone)
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#2A201B] border border-[#FAF5F0]/10">
                      <p className="text-[10px] text-[#B8ABA3] uppercase font-bold tracking-wider mb-0.5">
                        Declared Student Intake
                      </p>
                      <p className="text-sm font-semibold text-white">
                        120 Seats across Computer Science &amp; Engineering
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#FAF5F0]/10 flex items-center justify-between text-xs text-[#B8ABA3]">
                  <span>Source: Application Form</span>
                  <span className="text-[11px] font-mono text-[#BACDE0]">Unverified Claims</span>
                </div>
              </div>

              {/* Right: VerityAI Verifies (Midnight Slate-Navy with Restrained Mint Accents) */}
              <div className="bg-[#1F3954] text-[#FAF5F0] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-lg border border-[#2D4E70]">
                <div>
                  <div className="flex items-center justify-between pb-5 border-b border-[#BACDE0]/20 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#33CC7A]" />
                      <span className="text-xs font-bold text-white tracking-wider uppercase">
                        VerityAI Engine Scrutiny
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#33CC7A] px-2.5 py-0.5 rounded-full bg-[#33CC7A]/15 border border-[#33CC7A]/30">
                      DETERMINISTIC PROOF
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-[#182C40] border border-[#BACDE0]/15">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[#BACDE0] font-mono">
                          VAL-LAND-01 Land Norm Check
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#33CC7A] text-[#1B1411]">
                          PASSED
                        </span>
                      </div>
                      <p className="text-xs text-[#FAF5F0]/90">
                        7.42 Acres ≥ 5.0 Acres Statutory Minimum. Verified on Page 4 of Land Deed.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#182C40] border border-[#BACDE0]/15">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[#BACDE0] font-mono">
                          VAL-CMP-INTAKE Exact Match
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#33CC7A] text-[#1B1411]">
                          PASSED
                        </span>
                      </div>
                      <p className="text-xs text-[#FAF5F0]/90">
                        Declared 120 seats matches extracted EOA certificate value 120 (Page 1).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#182C40] border border-[#BACDE0]/15">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[#BACDE0] font-mono">
                          Tamper-Evident SHA-256
                        </span>
                        <span className="text-[10px] font-mono text-[#33CC7A] font-bold bg-[#33CC7A]/10 px-1.5 py-0.5 rounded">
                          0d322847...
                        </span>
                      </div>
                      <p className="text-xs text-[#FAF5F0]/90">
                        Dossier payload sealed in append-only SQLite WAL ledger.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#BACDE0]/20 flex items-center justify-between text-xs text-[#BACDE0]">
                  <span>Evidence-Linked Provenance</span>
                  <span className="font-semibold text-[#33CC7A]">Officer Review Ready →</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: 4-Step Scrutiny Methodology ─────────────────────── */}
        <section id="how-it-works" className="py-20 sm:py-28 px-6 sm:px-12 bg-[#EEE5DC]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="text-xs font-bold text-[#66574F] uppercase tracking-wider">
                Regulatory Methodology
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1B1411] mt-2 mb-3">
                A Four-Stage Verifiable Pipeline
              </h2>
              <p className="text-sm text-[#66574F] leading-relaxed">
                From institutional applicant intake to evidence-linked officer determination.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {WORKFLOW_STEPS.map((s) => {
                const IconComponent = s.icon;
                return (
                  <div
                    key={s.step}
                    className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5DDD5] shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:border-[#1B1411]/20"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-2xl font-bold text-[#1B1411] font-mono">
                          {s.step}
                        </span>
                        <div className="size-9 rounded-2xl bg-[#EEE5DC] flex items-center justify-center text-[#1B1411]">
                          <IconComponent className="size-4.5" />
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-[#1B1411] mb-2 leading-snug">
                        {s.title}
                      </h3>
                      <p className="text-xs text-[#66574F] leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: 6 Core Regulatory Capabilities ──────────────────── */}
        <section id="capabilities" className="py-20 sm:py-28 px-6 sm:px-12 bg-[#FAF5F0]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
              <div>
                <span className="text-xs font-bold text-[#66574F] uppercase tracking-wider">
                  Engineered for Compliance
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1B1411] mt-2">
                  Built for Statutory Scrutiny
                </h2>
              </div>
              <p className="text-sm text-[#66574F] max-w-md">
                Architected according to AICTE Approval Process Handbook (APH 2024–27) standards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {CAPABILITIES.map((c) => {
                const IconComponent = c.icon;
                return (
                  <div
                    key={c.title}
                    className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5DDD5] shadow-xs flex flex-col justify-between hover:border-[#1B1411]/20 hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="size-9 rounded-2xl bg-[#EEE5DC] flex items-center justify-center text-[#1B1411]">
                          <IconComponent className="size-4.5" />
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#33CC7A]/15 text-[#136639] border border-[#33CC7A]/30">
                          {c.pill}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#66574F] uppercase tracking-wider">
                        {c.category}
                      </span>
                      <h3 className="text-base font-bold text-[#1B1411] mt-1 mb-2">
                        {c.title}
                      </h3>
                      <p className="text-xs text-[#66574F] leading-relaxed">
                        {c.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Institutional Governance & Trust ────────────────── */}
        <section id="governance" className="py-20 sm:py-28 px-6 sm:px-12 bg-[#1F3954] text-[#FAF5F0]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="text-xs font-bold text-[#33CC7A] uppercase tracking-wider">
                Strict Regulatory Guardrails
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2 mb-3">
                Non-Negotiable Trust Architecture
              </h2>
              <p className="text-sm text-[#BACDE0] leading-relaxed">
                VerityAI is an evidence-traceable decision support system built under strict statutory principles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#182C40] rounded-3xl p-7 border border-[#BACDE0]/15 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#33CC7A]/15 text-[#33CC7A] border border-[#33CC7A]/25 mb-4 inline-block font-mono">
                    HUMAN SOVEREIGNTY
                  </span>
                  <h3 className="text-base font-bold text-white mb-2">
                    Human Review Authority
                  </h3>
                  <p className="text-xs text-[#BACDE0] leading-relaxed">
                    The engine never makes final statutory determinations or adverse denials.
                    Authorized scrutiny officers hold final decision-making power.
                  </p>
                </div>
              </div>

              <div className="bg-[#182C40] rounded-3xl p-7 border border-[#BACDE0]/15 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#33CC7A]/15 text-[#33CC7A] border border-[#33CC7A]/25 mb-4 inline-block font-mono">
                    PROVENANCE
                  </span>
                  <h3 className="text-base font-bold text-white mb-2">
                    Complete Traceability
                  </h3>
                  <p className="text-xs text-[#BACDE0] leading-relaxed">
                    Every finding cites source document, page number, and extracted character span.
                    Extracted text is never confounded with verified authenticity.
                  </p>
                </div>
              </div>

              <div className="bg-[#182C40] rounded-3xl p-7 border border-[#BACDE0]/15 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#33CC7A]/15 text-[#33CC7A] border border-[#33CC7A]/25 mb-4 inline-block font-mono">
                    HONEST STATUS
                  </span>
                  <h3 className="text-base font-bold text-white mb-2">
                    Simulated Status Transparency
                  </h3>
                  <p className="text-xs text-[#BACDE0] leading-relaxed">
                    Synthetic reference registries (AISHE, Land Records) are clearly labeled.
                    Evaluation runs transparently without claiming unconfigured external government connections.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Call to Action */}
            <div className="mt-16 p-8 sm:p-12 rounded-3xl bg-[#1B1411] border border-[#FAF5F0]/15 text-center max-w-3xl mx-auto shadow-2xl">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                Inspect Institutional Scrutiny in Action
              </h3>
              <p className="text-xs sm:text-sm text-[#BACDE0] max-w-md mx-auto mb-6 leading-relaxed">
                Explore the scrutiny platform with preloaded institutional dossiers
                and deterministic AICTE validation rules.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={onOpenApplicantPortal || onGetStarted}
                  className="linea-btn-mint px-6 py-3 text-xs font-bold gap-2 cursor-pointer"
                >
                  <Building2 className="size-4" />
                  Applicant Portal
                </button>
                <button
                  type="button"
                  onClick={onOfficerSignIn || onSignIn}
                  className="linea-btn-sand px-6 py-3 text-xs font-semibold gap-2 cursor-pointer hover:bg-white text-[#1B1411]"
                >
                  Officer Sign In
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Linea Editorial Footer ── */}
      <footer className="bg-[#1B1411] text-[#FAF5F0] py-12 px-6 sm:px-12 border-t border-[#FAF5F0]/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#33CC7A] flex items-center justify-center text-[#1B1411]">
              <ShieldCheck className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              VerityAI Scrutiny Platform
            </span>
          </div>

          <div className="text-center md:text-right text-[11px] text-[#B8ABA3]">
            <p>Institutional Regulatory Scrutiny System</p>
            <p className="mt-0.5">Statutory Decision Support · Evidence-Traceable Provenance</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
