import React, { useState, useEffect } from 'react';
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
  Lock,
  ChevronUp,
  Menu,
  X,
  Users,
  Shield,
  FileUp,
  MapPin,
  Search,
  CheckCircle2,
  Database,
  Copy,
  Link2,
  Info,
  Landmark,
  CheckSquare,
  Folder,
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

/* ── 4-Stage Scrutiny Workflow ────────────────────────────────────────────── */
const WORKFLOW_STEPS = [
  {
    step: '01',
    name: 'Submit',
    title: 'Institutional Intake & Dossier Upload',
    titleMain: 'Institutional Intake & ',
    titleAccent: 'Dossier Upload',
    category: 'Institutional Intake',
    description:
      'Institutions prepare, document, and submit statutory approval dossiers with declared campus metrics and mandatory certificate attachments under AICTE APH 2024–27 norms.',
    tag: 'Step 01 · Intake',
    pill: 'Intake Pipeline',
    icon: UploadCloud,
  },
  {
    step: '02',
    name: 'Extract',
    title: 'Document Intelligence & RapidOCR',
    titleMain: 'Document Intelligence & ',
    titleAccent: 'RapidOCR',
    category: 'Extraction & Provenance',
    description:
      'Structured text extraction parses multilingual and Devanagari numerals. Page-level confidence, bounding boxes, and parsing integrity are preserved without cloud token dependencies.',
    tag: 'Step 02 · Provenance',
    pill: 'Offline RapidOCR',
    icon: FileSearch,
  },
  {
    step: '03',
    name: 'Validate',
    title: 'Deterministic Norm Verification',
    titleMain: 'Deterministic Norm ',
    titleAccent: 'Verification',
    category: 'Statutory Criteria',
    description:
      'Zero-hallucination compliance rules verify contiguous land area, faculty cadres, structural stability, and approved intake ceilings against statutory baselines.',
    tag: 'Step 03 · Validation',
    pill: 'Zero Hallucination',
    icon: Layers,
  },
  {
    step: '04',
    name: 'Review',
    title: 'Human Officer Determination & Audit',
    titleMain: 'Human Officer ',
    titleAccent: 'Determination & Audit',
    category: 'Review & Determination',
    description:
      'Authorized scrutiny officers inspect evidence-linked findings, record formal determinations, and export tamper-evident reports sealed in an immutable cryptographic audit trail.',
    tag: 'Step 04 · Decision',
    pill: 'Officer Authority',
    icon: ClipboardList,
  },
];

/* ── 6 Core Regulatory Capabilities ────────────────────────────────────────── */
const CAPABILITIES = [
  {
    icon: FileText,
    title: 'Document Ingestion & OCR',
    titleMain: 'Document Ingestion ',
    titleAccent: '& OCR',
    category: 'Ingestion & Extraction',
    body: 'Structured intake, multi-format validation, and automated text extraction with per-document status tracking across PDF and scanned filings.',
    pill: 'Offline RapidOCR',
  },
  {
    icon: ShieldCheck,
    title: 'Deterministic Validation',
    titleMain: 'Deterministic ',
    titleAccent: 'Validation',
    category: 'Statutory Criteria',
    body: 'Rigid compliance algorithms enforce contiguous land norms, faculty-to-student ratios (FSR), building age limits, and validity periods without LLM guesswork.',
    pill: 'Zero Hallucination',
  },
  {
    icon: AlertTriangle,
    title: 'Discrepancy Detection',
    titleMain: 'Discrepancy ',
    titleAccent: 'Detection',
    category: 'Cross-Document Checking',
    body: 'Rule-based cross-document comparison identifying conflicting declarations between titles, disclosures, and institutional registrations.',
    pill: 'Anomaly Detection',
  },
  {
    icon: FileSearch,
    title: 'Evidence-Linked Review',
    titleMain: 'Evidence-Linked ',
    titleAccent: 'Review',
    category: 'Full Provenance',
    body: 'Every finding cites the exact source document, page number, candidate extracted value, and governing evaluation rule for transparent scrutiny.',
    pill: 'Traceable Findings',
  },
  {
    icon: History,
    title: 'Append-Only Audit Trail',
    titleMain: 'Append-Only ',
    titleAccent: 'Audit Trail',
    category: 'Legal Accountability',
    body: 'Cryptographically sealed chronological audit logging recording every document upload, evaluation run, and reviewer action with SHA-256 integrity.',
    pill: 'Tamper-Evident',
  },
  {
    icon: ClipboardList,
    title: 'Statutory Scrutiny Reports',
    titleMain: 'Statutory Scrutiny ',
    titleAccent: 'Reports',
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF5F0] text-[#202936] font-sans antialiased relative selection:bg-[#37C2CC] selection:text-[#FFFFFF]">
      {/* ── Accessible Skip Link ── */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Reference-Inspired Sticky Navigation Bar ── */}
      {/* ── Reference-Inspired Sticky Navigation Bar ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#F3F4F2]/98 backdrop-blur-md saas-navbar-sticky border-b border-[#DDE1DC]'
            : 'bg-[#F3F4F2] border-b border-[#E2E6E2]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Primary Navigation"
            className="h-18 flex items-center justify-between gap-4"
          >
            {/* Left: Brand Identity with Skewed Mark */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#102D50] flex items-center justify-center text-white shadow-xs border border-[#27C3C9]/30 shrink-0">
                <ShieldCheck className="size-5 text-[#27C3C9]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-manrope font-extrabold text-lg tracking-tight text-[#102D50]">
                    VerityAI
                  </span>
                  <span className="text-[#087E8B] font-manrope font-bold text-[11px] tracking-wide bg-[#E4F7F8] border border-[#CDE6EC] px-1.5 py-0.5 rounded">
                    Excel
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#40536B] tracking-normal mt-0.5 font-sans">
                  Institutional Application Scrutiny
                </span>
              </div>
            </div>

            {/* Center Navigation Links (High-contrast dark navy in default state) */}
            <ul className="hidden lg:flex items-center gap-1 xl:gap-2">
              <li>
                <a
                  href="#portals"
                  className="px-3.5 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] tracking-tight hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C3C9] focus-visible:ring-offset-2 active:bg-[#102D50]/10"
                >
                  Portals
                </a>
              </li>
              <li>
                <a
                  href="#comparison"
                  className="px-3.5 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] tracking-tight hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C3C9] focus-visible:ring-offset-2 active:bg-[#102D50]/10"
                >
                  Dual Verification
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="px-3.5 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] tracking-tight hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C3C9] focus-visible:ring-offset-2 active:bg-[#102D50]/10"
                >
                  Methodology
                </a>
              </li>
              <li>
                <a
                  href="#capabilities"
                  className="px-3.5 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] tracking-tight hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C3C9] focus-visible:ring-offset-2 active:bg-[#102D50]/10"
                >
                  Capabilities
                </a>
              </li>
              <li>
                <a
                  href="#governance"
                  className="px-3.5 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] tracking-tight hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C3C9] focus-visible:ring-offset-2 active:bg-[#102D50]/10"
                >
                  Governance
                </a>
              </li>
            </ul>

            {/* Right Action Trigger Buttons */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {!currentUser && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="hidden sm:inline-flex text-[14.5px] font-manrope font-semibold px-3.5 py-2 text-[#102D50] hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-colors cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C3C9] focus-visible:ring-offset-2"
                >
                  Sign In
                </button>
              )}

              {/* Enter Workspace Animated Button */}
              <button
                type="button"
                onClick={onEnterWorkspace || onGetStarted}
                className="verity-workspace-btn"
                aria-label="Enter Workspace"
              >
                <span className="circle" aria-hidden="true" />
                <span className="text">Enter Workspace</span>
                <ArrowRight className="arr-1 size-4" aria-hidden="true" />
                <ArrowRight className="arr-2 size-4" aria-hidden="true" />
              </button>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                className="lg:hidden p-2 rounded-lg text-[#102D50] hover:bg-[#102D50]/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C3C9]"
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Dropdown Navigation Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E2E6E2] bg-[#F3F4F2]/98 backdrop-blur-md px-4 py-3 shadow-lg">
            <ul className="space-y-1">
              <li>
                <a
                  href="#portals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-colors"
                >
                  Portals
                </a>
              </li>
              <li>
                <a
                  href="#comparison"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-colors"
                >
                  Dual Verification
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-colors"
                >
                  Methodology
                </a>
              </li>
              <li>
                <a
                  href="#capabilities"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-colors"
                >
                  Capabilities
                </a>
              </li>
              <li>
                <a
                  href="#governance"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-[15px] font-manrope font-semibold text-[#102D50] hover:text-[#087E8B] hover:bg-[#102D50]/5 transition-colors"
                >
                  Governance
                </a>
              </li>
            </ul>
            <div className="pt-3 mt-2 border-t border-[#E2E6E2] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  (onEnterWorkspace || onGetStarted)();
                }}
                className="w-full text-center py-2.5 px-4 rounded-xl bg-[#102D50] text-white font-manrope font-semibold text-sm cursor-pointer shadow-xs"
              >
                Enter Workspace
              </button>
              {!currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignIn();
                  }}
                  className="w-full text-center px-3 py-2 text-sm font-manrope font-semibold text-[#102D50] hover:text-[#087E8B] hover:bg-[#102D50]/5 rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content Container ── */}
      <main id="main-content">
        {/* ── SECTION 1: High-Impact Regulatory Hero with Dual Portal Selector ── */}
        <section
          id="hero"
          className="relative bg-gradient-to-b from-[#1F3954] via-[#1A3149] to-[#15273A] text-[#FAF5F0] pt-12 pb-20 sm:pt-16 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[#FAF5F0]/10"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#37C2CC]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#33CC7A]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto relative z-10 space-y-8 text-center">
            {/* Authoritative Headline */}
            <div className="space-y-4 max-w-4xl mx-auto">
              <h1 className="text-3xl sm:text-5xl lg:text-[58px] tracking-tight leading-[1.12]">
                <span className="font-editorial italic font-normal text-white">Every statutory filing,</span> <br />
                <span className="font-manrope font-extrabold text-[#27C3C9]">verified to its source.</span>
              </h1>
              <p className="text-[15px] sm:text-base lg:text-[17px] text-[#C5D3E0] max-w-2xl mx-auto leading-relaxed font-sans font-normal">
                An evidence-traceable institutional application scrutiny and validation platform.
                Combining automated RapidOCR extraction, deterministic compliance rules, and human-in-the-loop review.
              </p>
            </div>

            {/* ── Two Principal Portal Destination Cards ── */}
            <div id="portals" className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 text-left max-w-5xl mx-auto items-stretch">
              {/* Portal 1: Institutional Portal (Light Card) */}
              <div className="group relative bg-[#FAF5F0] text-[#142B45] rounded-3xl p-7 sm:p-8 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.18)] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_-8px_rgba(0,0,0,0.22)]">
                <div>
                  {/* Top: Icon + Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="size-12 rounded-xl bg-[#D7F3F5] flex items-center justify-center text-[#142B45] shadow-xs shrink-0">
                      <Landmark className="size-6 text-[#142B45]" />
                    </div>
                    <span className="px-3.5 py-1 rounded-full bg-[#D7F3F5] text-[#087E8B] border border-[#BCE8ED] font-manrope font-semibold text-[11px] sm:text-[11.5px] tracking-wider uppercase">
                      Applicant Intake
                    </span>
                  </div>

                  {/* Card Heading */}
                  <h2 className="text-2xl sm:text-[25px] font-manrope font-semibold text-[#142B45] mb-3 tracking-tight leading-snug">
                    Institutional Applicant Portal
                  </h2>

                  {/* Card Description */}
                  <p className="text-[15px] sm:text-[15.5px] text-[#344B63] leading-relaxed mb-7 font-sans font-normal">
                    For technical colleges and institutions to prepare statutory approval dossiers,
                    upload mandatory compliance documents, and verify self-declarations against AICTE baselines.
                  </p>

                  {/* Feature List */}
                  <div className="space-y-3 mb-8 text-[14px] sm:text-[14.5px] text-[#142B45] font-sans font-normal">
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-[#087E8B] shrink-0" />
                      <span>Step-by-step statutory application intake wizard</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="size-4 text-[#087E8B] shrink-0" />
                      <span>Mandatory certificate checklist &amp; upload controls</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Folder className="size-4 text-[#087E8B] shrink-0" />
                      <span>Instant RapidOCR preview &amp; declaration verification</span>
                    </div>
                  </div>
                </div>

                {/* Primary Teal Action Button */}
                <button
                  type="button"
                  onClick={onOpenApplicantPortal || onGetStarted}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#00B4D8] hover:bg-[#0096B4] text-white font-manrope font-semibold text-[15px] sm:text-[15.5px] inline-flex items-center justify-center gap-2.5 cursor-pointer shadow-md transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8] focus-visible:ring-offset-2"
                >
                  <Landmark className="size-4.5" />
                  <span>Access Institutional Portal</span>
                  <ArrowRight className="size-4.5" />
                </button>
              </div>

              {/* Portal 2: Administrative Review Portal (Dark Card) */}
              <div className="group relative bg-[#0A1C2C] text-[#F5F7FA] rounded-3xl p-7 sm:p-8 border border-[#1E3750] shadow-[0_12px_36px_-8px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#20BFC3]/50 hover:shadow-[0_16px_44px_-8px_rgba(0,0,0,0.5)]">
                <div>
                  {/* Top: Icon + Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="size-12 rounded-xl bg-[#0E2847] border border-[#224466] flex items-center justify-center text-[#20BFC3] shadow-xs shrink-0">
                      <Shield className="size-6 text-[#20BFC3]" />
                    </div>
                    <span className="px-3.5 py-1 rounded-full bg-[#0B2136] text-[#20BFC3] border border-[#20BFC3]/40 font-manrope font-semibold text-[11px] sm:text-[11.5px] tracking-wider uppercase">
                      Scrutiny &amp; Audit
                    </span>
                  </div>

                  {/* Card Heading */}
                  <h2 className="text-2xl sm:text-[25px] font-manrope font-semibold text-[#F5F7FA] mb-3 tracking-tight leading-snug">
                    Regulatory Scrutiny Portal
                  </h2>

                  {/* Card Description */}
                  <p className="text-[15px] sm:text-[15.5px] text-[#C5D3E0] leading-relaxed mb-7 font-sans font-normal">
                    For designated regional scrutiny officers and administrators to triage submitted dossiers,
                    evaluate evidence-linked findings, and record formal audit determinations.
                  </p>

                  {/* Feature List */}
                  <div className="space-y-3 mb-8 text-[14px] sm:text-[14.5px] text-[#C5D3E0] font-sans font-normal">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="size-4 text-[#20BFC3] shrink-0" />
                      <span>Prioritized scrutiny queue with risk flags</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="size-4 text-[#20BFC3] shrink-0" />
                      <span>Multi-tab dossier inspector &amp; PDF bounding-box view</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="size-4 text-[#20BFC3] shrink-0" />
                      <span>Immutable cryptographic audit logging &amp; report export</span>
                    </div>
                  </div>
                </div>

                {/* Outlined Action Button */}
                <button
                  type="button"
                  onClick={onOfficerSignIn || onSignIn}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0A1C2C] hover:bg-[#122B42] text-white border border-[#20BFC3] hover:border-[#38D5D9] font-manrope font-semibold text-[15px] sm:text-[15.5px] inline-flex items-center justify-center gap-2.5 cursor-pointer shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20BFC3] focus-visible:ring-offset-2"
                >
                  <Lock className="size-4.5 text-white" />
                  <span>Officer &amp; Admin Sign In</span>
                  <ArrowRight className="size-4.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Dual Verification ("Applicant Declares" vs "VerityAI Verifies") ── */}
        <section id="comparison" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#FAF5F0]">
          <div className="max-w-6xl mx-auto">
            {/* Section Header (No introductory paragraph on right) */}
            <div className="mb-10 sm:mb-12">
              <span className="text-[12px] font-manrope font-bold text-[#40536B] uppercase tracking-[0.14em] mb-2.5 block">
                TRANSPARENT SCRUTINY ARCHITECTURE
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-editorial font-bold tracking-tight text-[#0B1F3A] leading-[1.12]">
                Nothing lost between <br />
                <span>a declaration and </span>
                <span className="text-[#087E8B]">an audit.</span>
              </h2>
              <div className="w-12 h-1 rounded-full bg-gradient-to-r from-[#087E8B] to-[#20BFC3] mt-3.5" />
            </div>

            {/* The Dual Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
              {/* Left: Applicant Submission (Deep Institutional Navy) */}
              <div className="bg-[#0A1826] text-[#FAF5F0] rounded-2xl p-6 sm:p-7 border border-[#1E3347] shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-[#20BFC3]/40">
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-5 border-b border-[#1E3347] mb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="relative size-12 shrink-0">
                        <div className="absolute -top-1 -left-1 size-12 rounded-xl bg-[#20BFC3]/20" />
                        <div className="relative size-12 rounded-xl bg-gradient-to-br from-[#0E2847] to-[#0A1F38] border border-[#224466] text-[#20BFC3] flex items-center justify-center shadow-xs">
                          <FileUp className="size-5.5 text-[#20BFC3] stroke-[2.2]" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-manrope font-bold text-lg sm:text-[19px] text-white tracking-tight leading-snug">
                          Applicant Submission
                        </h3>
                        <p className="text-xs text-[#8FA6BC] font-sans">
                          From declaration to verified dossier
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#0D263D] border border-[#20BFC3]/40 text-[#20BFC3] text-xs font-manrope font-semibold tracking-wide shrink-0">
                      Declared Dossier
                    </span>
                  </div>

                  {/* 3 Fields */}
                  <div className="space-y-3.5">
                    {/* Field 1: Institution */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0F2236]/80 border border-[#1E364E] flex items-center gap-3.5">
                      <div className="size-10 rounded-lg bg-[#0C1B2B] border border-[#1E3347] flex items-center justify-center text-[#20BFC3] shrink-0">
                        <Building2 className="size-5 text-[#20BFC3]" />
                      </div>
                      <div>
                        <span className="text-[10.5px] font-manrope font-bold text-[#7E95AC] uppercase tracking-wider block mb-0.5">
                          INSTITUTION
                        </span>
                        <p className="text-[14.5px] sm:text-[15px] font-manrope font-bold text-white">
                          Apex Institute of Technology &amp; Management
                        </p>
                      </div>
                    </div>

                    {/* Field 2: Campus Location */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0F2236]/80 border border-[#1E364E] flex items-center gap-3.5">
                      <div className="size-10 rounded-lg bg-[#0C1B2B] border border-[#1E3347] flex items-center justify-center text-[#20BFC3] shrink-0">
                        <MapPin className="size-5 text-[#20BFC3]" />
                      </div>
                      <div>
                        <span className="text-[10.5px] font-manrope font-bold text-[#7E95AC] uppercase tracking-wider block mb-0.5">
                          CAMPUS LOCATION
                        </span>
                        <p className="text-[14.5px] sm:text-[15px] font-manrope font-bold text-white">
                          7.42 Contiguous Acres (Rural / Mega City Zone)
                        </p>
                      </div>
                    </div>

                    {/* Field 3: Student Intake (Amber highlight matching screenshot) */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#241A12]/85 border border-[#B45309]/40 flex items-center gap-3.5">
                      <div className="size-10 rounded-lg bg-[#341F12] border border-[#B45309]/50 flex items-center justify-center text-[#F59E0B] shrink-0">
                        <Users className="size-5 text-[#F59E0B]" />
                      </div>
                      <div>
                        <span className="text-[10.5px] font-manrope font-bold text-[#D97706] uppercase tracking-wider block mb-0.5">
                          STUDENT INTAKE
                        </span>
                        <p className="text-[14.5px] sm:text-[15px] font-manrope font-bold text-[#FDE68A]">
                          120 Seats – Computer Science &amp; Engineering
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left Card Footer */}
                <div className="pt-4 mt-5 border-t border-[#1E3347] flex items-center justify-between text-xs text-[#7E95AC] font-sans">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-[#7E95AC]" />
                    <span>Source: Application Form</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#7E95AC]">
                    <span>Unverified Claims</span>
                    <Info className="size-3.5 text-[#7E95AC]" />
                  </div>
                </div>
              </div>

              {/* Right: VerityAI Engine Scrutiny (Midnight Slate-Navy with Teal Accents) */}
              <div className="bg-[#0A1826] text-[#FAF5F0] rounded-2xl p-6 sm:p-7 border border-[#1E3347] shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-[#20BFC3]/40">
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-5 border-b border-[#1E3347] mb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="relative size-12 shrink-0">
                        <div className="absolute -top-1 -left-1 size-12 rounded-xl bg-[#20BFC3]/20" />
                        <div className="relative size-12 rounded-xl bg-gradient-to-br from-[#0E2847] to-[#0A1F38] border border-[#224466] text-[#20BFC3] flex items-center justify-center shadow-xs">
                          <Search className="size-5.5 text-[#20BFC3] stroke-[2.2]" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-manrope font-bold text-lg sm:text-[19px] text-white tracking-tight leading-snug">
                          VerityAI Engine Scrutiny
                        </h3>
                        <p className="text-xs text-[#8FA6BC] font-sans">
                          Deterministic checks with evidence trails
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#0D263D] border border-[#20BFC3]/40 text-[#20BFC3] text-xs font-manrope font-semibold tracking-wide shrink-0">
                      Deterministic Proof
                    </span>
                  </div>

                  {/* 3 Checks */}
                  <div className="space-y-3.5">
                    {/* Check 1: Land Norm Check */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0F2236]/80 border border-[#1E364E] flex items-start gap-3.5">
                      <div className="size-10 rounded-lg bg-[#0C1B2B] border border-[#1E3347] flex items-center justify-center text-[#20BFC3] shrink-0 mt-0.5">
                        <FileText className="size-5 text-[#20BFC3]" />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[10.5px] font-manrope font-bold text-[#7E95AC] uppercase tracking-wider block mb-0.5">
                          LAND NORM CHECK
                        </span>
                        <p className="text-[13.5px] sm:text-[14px] font-manrope font-bold text-white">
                          7.42 Acres ≥ 5.0 Acres (Statutory Minimum)
                        </p>
                        <p className="text-xs text-[#8FA6BC] font-sans mt-0.5">
                          Verified on Page 4 of Land Deed.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-manrope font-bold text-xs shrink-0 self-center">
                        <CheckCircle2 className="size-3.5 text-[#10B981]" />
                        <span>Passed</span>
                      </div>
                    </div>

                    {/* Check 2: Intake Match */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0F2236]/80 border border-[#1E364E] flex items-start gap-3.5">
                      <div className="size-10 rounded-lg bg-[#0C1B2B] border border-[#1E3347] flex items-center justify-center text-[#20BFC3] shrink-0 mt-0.5">
                        <Database className="size-5 text-[#20BFC3]" />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[10.5px] font-manrope font-bold text-[#7E95AC] uppercase tracking-wider block mb-0.5">
                          INTAKE MATCH
                        </span>
                        <p className="text-[13.5px] sm:text-[14px] font-manrope font-bold text-white">
                          Declared 120 seats matches EOA certificate (Page 1).
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-manrope font-bold text-xs shrink-0 self-center">
                        <CheckCircle2 className="size-3.5 text-[#10B981]" />
                        <span>Passed</span>
                      </div>
                    </div>

                    {/* Check 3: Audit Trail */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0F2236]/80 border border-[#1E364E] flex items-center justify-between gap-3.5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-10 rounded-lg bg-[#0C1B2B] border border-[#1E3347] flex items-center justify-center text-[#20BFC3] shrink-0">
                          <Lock className="size-5 text-[#20BFC3]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10.5px] font-manrope font-bold text-[#7E95AC] uppercase tracking-wider block mb-0.5">
                            AUDIT TRAIL
                          </span>
                          <p className="text-xs sm:text-[13px] text-[#8FA6BC] font-sans truncate">
                            Dossier sealed in append-only ledger (SHA-256).
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0D263D] border border-[#20BFC3]/30 text-[#20BFC3] font-mono text-xs shrink-0">
                        <span>0d322847...</span>
                        <Copy className="size-3 text-[#20BFC3]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card Footer */}
                <div className="pt-4 mt-5 border-t border-[#1E3347] flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-2 text-[#7E95AC]">
                    <Link2 className="size-3.5 text-[#7E95AC]" />
                    <span>Evidence-Linked Provenance</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOfficerSignIn || onSignIn}
                    className="font-manrope font-bold text-[#20BFC3] hover:text-[#48D1D6] transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Officer Review Ready</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: 4-Step Scrutiny Methodology ─────────────────────── */}
        <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#EEE5DC]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="text-[12px] font-manrope font-bold text-[#40536B] uppercase tracking-[0.08em] block">
                Regulatory Methodology
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-manrope font-extrabold tracking-tight text-[#0B1F3A] mt-2 mb-3 leading-[1.12]">
                A Four-Stage Verifiable Pipeline
              </h2>
              <p className="text-sm sm:text-base text-[#40536B] leading-relaxed font-sans font-normal">
                From institutional applicant intake to evidence-linked officer determination.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {WORKFLOW_STEPS.map((s) => {
                const IconComponent = s.icon;
                return (
                  <div
                    key={s.step}
                    className="group institutional-feature-card"
                  >
                    {/* Decorative Corner Watermark Arc & Micro Dots */}
                    <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-gradient-to-tl from-[#E4F7F8] to-transparent opacity-60 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute right-4 bottom-4 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-300 grid grid-cols-4 gap-1.5 z-0">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="size-1 rounded-full bg-[#087E8B]" />
                      ))}
                    </div>

                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div>
                        {/* Top: Icon Container + Step Pill */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="relative size-14 shrink-0">
                            {/* Backing pale-aqua plate */}
                            <div className="absolute -top-1.5 -left-1.5 size-14 rounded-2xl bg-[#D6F3F5] transition-transform duration-300 group-hover:scale-105" />
                            {/* Front rich navy squircle */}
                            <div className="relative size-14 rounded-2xl bg-gradient-to-br from-[#102D50] via-[#0E2847] to-[#0A1F38] text-white flex items-center justify-center shadow-[0_8px_18px_-4px_rgba(16,45,80,0.4)] transition-transform duration-300 group-hover:-translate-y-0.5">
                              <IconComponent className="size-6 text-white stroke-[2.2]" />
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4F7F8] border border-[#CDE6EC] text-[#087E8B] text-[11px] font-manrope font-bold uppercase tracking-wider shadow-2xs">
                            <ShieldCheck className="size-3.5 text-[#087E8B]" />
                            <span>Step {s.step}</span>
                          </div>
                        </div>

                        {/* Category Label + Accent Indicator Bar */}
                        <div className="mb-2">
                          <span className="text-[12px] font-manrope font-bold text-[#40536B] uppercase tracking-[0.08em] block">
                            {s.category}
                          </span>
                          <div className="w-9 h-[2.5px] rounded-full bg-gradient-to-r from-[#102D50] via-[#087E8B] to-[#20BFC3] mt-1.5 mb-2.5" />
                        </div>

                        {/* Two-Tone Title */}
                        <h3 className="text-[20px] sm:text-[21px] font-manrope font-extrabold text-[#0B1F3A] leading-[1.22] tracking-tight mb-2.5">
                          <span className="text-[#0B1F3A]">{s.titleMain}</span>
                          <span className="text-[#20BFC3]">{s.titleAccent}</span>
                        </h3>

                        {/* Description */}
                        <p className="text-[13.5px] sm:text-[14px] text-[#40536B] leading-relaxed font-sans font-normal">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: 6 Core Regulatory Capabilities ──────────────────── */}
        <section id="capabilities" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#FAF5F0]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
              <div>
                <span className="text-[12px] font-manrope font-bold text-[#40536B] uppercase tracking-[0.08em] block">
                  Engineered for Compliance
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-manrope font-extrabold tracking-tight text-[#0B1F3A] mt-2 leading-[1.12]">
                  Built for Statutory Scrutiny
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#40536B] max-w-md font-sans leading-relaxed">
                Architected according to AICTE Approval Process Handbook (APH 2024–27) standards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CAPABILITIES.map((c) => {
                const IconComponent = c.icon;
                return (
                  <div
                    key={c.title}
                    className="group institutional-feature-card"
                  >
                    {/* Decorative Corner Watermark Arc & Micro Dots */}
                    <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-gradient-to-tl from-[#E4F7F8] to-transparent opacity-60 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute right-4 bottom-4 pointer-events-none opacity-20 group-hover:opacity-45 transition-opacity duration-300 grid grid-cols-4 gap-1.5 z-0">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="size-1 rounded-full bg-[#087E8B]" />
                      ))}
                    </div>

                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div>
                        {/* Top: Icon Container + Status Badge */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="relative size-14 shrink-0">
                            {/* Backing pale-aqua plate */}
                            <div className="absolute -top-1.5 -left-1.5 size-14 rounded-2xl bg-[#D6F3F5] transition-transform duration-300 group-hover:scale-105" />
                            {/* Front rich navy squircle */}
                            <div className="relative size-14 rounded-2xl bg-gradient-to-br from-[#102D50] via-[#0E2847] to-[#0A1F38] text-white flex items-center justify-center shadow-[0_8px_18px_-4px_rgba(16,45,80,0.4)] transition-transform duration-300 group-hover:-translate-y-0.5">
                              <IconComponent className="size-6 text-white stroke-[2.2]" />
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4F7F8] border border-[#CDE6EC] text-[#087E8B] text-[11px] sm:text-[12px] font-manrope font-bold uppercase tracking-wider shadow-2xs">
                            <ShieldCheck className="size-3.5 text-[#087E8B]" />
                            <span>{c.pill}</span>
                          </div>
                        </div>

                        {/* Category Label + Accent Indicator Bar */}
                        <div className="mb-2">
                          <span className="text-[12px] sm:text-[13px] font-manrope font-bold text-[#40536B] uppercase tracking-[0.08em] block">
                            {c.category}
                          </span>
                          <div className="w-10 h-[2.5px] rounded-full bg-gradient-to-r from-[#102D50] via-[#087E8B] to-[#20BFC3] mt-1.5 mb-2.5" />
                        </div>

                        {/* Two-Tone Title */}
                        <h3 className="text-[21px] sm:text-[23px] font-manrope font-extrabold leading-[1.22] tracking-tight mb-3">
                          <span className="text-[#0B1F3A]">{c.titleMain}</span>
                          <span className="text-[#20BFC3]">{c.titleAccent}</span>
                        </h3>

                        {/* Description */}
                        <p className="text-[14px] sm:text-[14.5px] text-[#40536B] leading-relaxed font-sans font-normal">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Institutional Governance & Trust ────────────────── */}
        <section id="governance" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#102D50] text-[#FAF5F0] relative overflow-hidden">
          {/* Subtle Ambient Radial Teal Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#27C3C9]/10 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[#087E8B]/15 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-[#142C42]/50 rounded-full blur-2xl pointer-events-none -z-0" />

          {/* Decorative Bottom Left Dot Grid matching approved reference */}
          <div className="absolute bottom-12 left-8 pointer-events-none opacity-25 hidden md:grid grid-cols-6 gap-2.5 z-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="size-1 rounded-full bg-[#27C3C9]" />
            ))}
          </div>

          <div className="max-w-6xl mx-auto relative z-10">
            {/* Section Heading & Description */}
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[12px] font-manrope font-bold text-[#27C3C9] uppercase tracking-[0.14em] block mb-2.5">
                TRUSTED • TRANSPARENT • STATUTORY
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-manrope font-extrabold tracking-tight leading-[1.12] text-white">
                Non-Negotiable <span className="text-[#27C3C9]">Trust Architecture</span>
              </h2>
              <p className="text-base sm:text-[17px] text-[#C6D9EC] max-w-2xl mx-auto mt-4 leading-relaxed font-sans font-normal">
                VerityAI is an evidence-traceable decision support system built under strict statutory principles.
              </p>
            </div>

            {/* Three Trust Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {/* Card 1: Human Review Authority */}
              <div className="bg-[#142C42] rounded-3xl p-7 sm:p-8 border border-[#29465E] hover:border-[#27C3C9]/60 shadow-[0_8px_24px_-4px_rgba(4,20,38,0.4)] hover:shadow-[0_20px_40px_-6px_rgba(4,20,38,0.6)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-tl from-[#27C3C9]/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="relative size-14 shrink-0">
                      <div className="absolute -top-1.5 -left-1.5 size-14 rounded-2xl bg-[#27C3C9]/20 transition-transform duration-300 group-hover:scale-105" />
                      <div className="relative size-14 rounded-2xl bg-[#0B1F3A] border border-[#29465E] text-[#27C3C9] flex items-center justify-center shadow-md transition-transform duration-300 group-hover:-translate-y-0.5">
                        <Users className="size-6 text-[#27C3C9] stroke-[2.2]" />
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0B1F3A]/80 text-[#27C3C9] border border-[#27C3C9]/40 font-manrope tracking-wide">
                      Human Sovereignty
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-[22px] font-manrope font-extrabold text-white tracking-tight leading-snug mb-3">
                    Human Review <span className="text-[#27C3C9]">Authority</span>
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#C6D9EC] leading-relaxed font-sans font-normal">
                    The engine never makes final statutory determinations or adverse denials.
                    Authorized scrutiny officers hold final decision-making power.
                  </p>
                </div>
              </div>

              {/* Card 2: Complete Traceability */}
              <div className="bg-[#142C42] rounded-3xl p-7 sm:p-8 border border-[#29465E] hover:border-[#27C3C9]/60 shadow-[0_8px_24px_-4px_rgba(4,20,38,0.4)] hover:shadow-[0_20px_40px_-6px_rgba(4,20,38,0.6)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-tl from-[#27C3C9]/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="relative size-14 shrink-0">
                      <div className="absolute -top-1.5 -left-1.5 size-14 rounded-2xl bg-[#27C3C9]/20 transition-transform duration-300 group-hover:scale-105" />
                      <div className="relative size-14 rounded-2xl bg-[#0B1F3A] border border-[#29465E] text-[#27C3C9] flex items-center justify-center shadow-md transition-transform duration-300 group-hover:-translate-y-0.5">
                        <FileText className="size-6 text-[#27C3C9] stroke-[2.2]" />
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0B1F3A]/80 text-[#27C3C9] border border-[#27C3C9]/40 font-manrope tracking-wide">
                      Provenance
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-[22px] font-manrope font-extrabold text-white tracking-tight leading-snug mb-3">
                    Complete <span className="text-[#27C3C9]">Traceability</span>
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#C6D9EC] leading-relaxed font-sans font-normal">
                    Every finding cites source document, page number, and extracted character span.
                    Extracted text is never confounded with verified authenticity.
                  </p>
                </div>
              </div>

              {/* Card 3: Simulated Status Transparency */}
              <div className="bg-[#142C42] rounded-3xl p-7 sm:p-8 border border-[#29465E] hover:border-[#27C3C9]/60 shadow-[0_8px_24px_-4px_rgba(4,20,38,0.4)] hover:shadow-[0_20px_40px_-6px_rgba(4,20,38,0.6)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-tl from-[#27C3C9]/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="relative size-14 shrink-0">
                      <div className="absolute -top-1.5 -left-1.5 size-14 rounded-2xl bg-[#27C3C9]/20 transition-transform duration-300 group-hover:scale-105" />
                      <div className="relative size-14 rounded-2xl bg-[#0B1F3A] border border-[#29465E] text-[#27C3C9] flex items-center justify-center shadow-md transition-transform duration-300 group-hover:-translate-y-0.5">
                        <Shield className="size-6 text-[#27C3C9] stroke-[2.2]" />
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0B1F3A]/80 text-[#27C3C9] border border-[#27C3C9]/40 font-manrope tracking-wide">
                      Honest Status
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-[22px] font-manrope font-extrabold text-white tracking-tight leading-snug mb-3">
                    Simulated <span className="text-[#27C3C9]">Status Transparency</span>
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#C6D9EC] leading-relaxed font-sans font-normal">
                    Synthetic reference registries (AISHE, Land Records) are clearly labeled.
                    Evaluation runs transparently without claiming unconfigured external government connections.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Call to Action Panel */}
            <div className="p-8 sm:p-12 rounded-3xl bg-[#0D2235] border border-[#223E56] text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#27C3C9]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-manrope font-extrabold text-white mb-3 tracking-tight leading-tight">
                  Inspect Institutional Scrutiny <span className="text-[#27C3C9]">in Action</span>
                </h3>
                <p className="text-sm sm:text-base text-[#C6D9EC] max-w-xl mx-auto mb-8 leading-relaxed font-sans font-normal">
                  Explore the scrutiny platform with preloaded institutional dossiers
                  and deterministic AICTE validation rules.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={onOpenApplicantPortal || onGetStarted}
                    className="bg-[#27C3C9] hover:bg-[#20BFC3] text-[#0A1F38] font-manrope font-bold text-sm sm:text-[15px] px-7 py-3.5 rounded-xl shadow-lg transition-all duration-300 hover:shadow-[0_8px_24px_rgba(39,195,201,0.4)] hover:-translate-y-0.5 inline-flex items-center gap-2.5 cursor-pointer"
                  >
                    <Building2 className="size-4.5" />
                    <span>Applicant Portal</span>
                    <ArrowRight className="size-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onOfficerSignIn || onSignIn}
                    className="bg-[#0E2338] hover:bg-[#142C42] text-white border border-[#29465E] hover:border-[#3A5B7A] font-manrope font-semibold text-sm sm:text-[15px] px-7 py-3.5 rounded-xl shadow-md transition-all duration-300 hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="size-4.5 text-[#27C3C9]" />
                    <span>Officer Sign In</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Top Blue Accent Band ── */}
      <div className="w-full h-2.5 sm:h-3 bg-[#1F3A54]" />

      {/* ── Multi-Column Structured Footer ── */}
      <footer className="bg-[#101923] text-[#F8FAFC] pt-12 pb-8 sm:pt-14 sm:pb-9 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10">
            {/* Col 1: Brand & Capability (4 cols) */}
            <div className="lg:col-span-4 lg:border-r lg:border-[#2B3947] lg:pr-8 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-[#162534] border border-[#2FC3CA]/40 flex items-center justify-center text-[#2FC3CA] shadow-xs shrink-0">
                  <ShieldCheck className="size-5 text-[#2FC3CA]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-manrope font-extrabold text-[21px] sm:text-[22px] tracking-tight text-white">
                    VerityAI
                  </span>
                  <span className="font-manrope font-bold text-xs bg-[#2FC3CA] text-[#0A1F38] px-2.5 py-0.5 rounded-md">
                    Excel
                  </span>
                </div>
              </div>
              <p className="text-[13.5px] sm:text-[14px] text-[#C5D3E0] leading-relaxed max-w-sm font-sans font-normal">
                An AI-assisted platform for reviewing institutional applications through explainable, evidence-linked verification.
              </p>
              <div className="flex items-center gap-2 text-[13px] text-[#C5D3E0] font-sans font-medium pt-1">
                <span className="size-2 rounded-full bg-[#2FC3CA] shrink-0" />
                <span>Evidence-Linked Verification</span>
              </div>
            </div>

            {/* Col 2: Institutional Intake (3 cols) */}
            <div className="lg:col-span-3 space-y-3.5">
              <h4 className="text-[13px] sm:text-[14px] font-manrope font-bold text-[#F8FAFC] uppercase tracking-wider">
                Institutional Intake
              </h4>
              <ul className="space-y-2.5 text-[13.5px] font-sans">
                <li>
                  <button
                    type="button"
                    onClick={onOpenApplicantPortal || onGetStarted}
                    className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors cursor-pointer text-left font-sans block"
                  >
                    Applicant Portal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors cursor-pointer text-left font-sans block"
                  >
                    Intake Wizard &amp; Upload
                  </button>
                </li>
                <li>
                  <a href="#how-it-works" className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors block font-sans">
                    Mandatory Checklist
                  </a>
                </li>
                <li>
                  <a href="#comparison" className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors block font-sans">
                    Declaration Verification
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Scrutiny & Norms (2.5 cols -> 2 cols) */}
            <div className="lg:col-span-2 space-y-3.5">
              <h4 className="text-[13px] sm:text-[14px] font-manrope font-bold text-[#F8FAFC] uppercase tracking-wider">
                Scrutiny &amp; Norms
              </h4>
              <ul className="space-y-2.5 text-[13.5px] font-sans">
                <li>
                  <button
                    type="button"
                    onClick={onOfficerSignIn || onSignIn}
                    className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors cursor-pointer text-left font-sans block"
                  >
                    Scrutiny Queue
                  </button>
                </li>
                <li>
                  <a href="#capabilities" className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors block font-sans">
                    Deterministic Norm Rules
                  </a>
                </li>
                <li>
                  <a href="#comparison" className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors block font-sans">
                    Evidence Bounding Boxes
                  </a>
                </li>
                <li>
                  <a href="#governance" className="text-[#93A9BC] hover:text-[#48D1D6] transition-colors block font-sans">
                    Audit Trail &amp; SHA-256
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Governance (3 cols) */}
            <div className="lg:col-span-3 space-y-3.5">
              <h4 className="text-[13px] sm:text-[14px] font-manrope font-bold text-[#F8FAFC] uppercase tracking-wider">
                Governance
              </h4>
              <ul className="space-y-2.5 text-[13px] font-sans">
                <li className="flex items-center gap-3">
                  <span className="text-xs text-[#2FC3CA] font-manrope font-bold w-11 shrink-0">APH</span>
                  <span className="text-[#C5D3E0]">AICTE 2024–27</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-xs text-[#2FC3CA] font-manrope font-bold w-11 shrink-0">GIGW</span>
                  <span className="text-[#C5D3E0]">GIGW 3.0 Accessible</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-xs text-[#2FC3CA] font-manrope font-bold w-11 shrink-0">RBAC</span>
                  <span className="text-[#C5D3E0]">Role-Based Access</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-xs text-[#2FC3CA] font-manrope font-bold w-11 shrink-0">SIM</span>
                  <span className="text-[#C5D3E0]">Reference Data Only</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Row Divider & Disclaimers */}
          <div className="pt-6 border-t border-[#2B3947] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#93A9BC] font-sans">
            <p>© {new Date().getFullYear()} VerityAI · Smart India Hackathon Prototype. Data for Demonstration Only.</p>
            <p>Non-operational AICTE decision-support platform · Human Review Required.</p>
          </div>
        </div>
      </footer>

      {/* ── Floating Scroll-to-Top Button (from Reference Pattern) ── */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="saas-scroll-top"
        >
          <ChevronUp className="size-5" />
        </button>
      )}
    </div>
  );
};
