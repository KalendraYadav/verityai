import React from 'react';
import { VerityAIExcelLogo } from '../brand/VerityAIExcelLogo';
import {
  ArrowRight,
  ShieldCheck,
  FileSearch,
  ClipboardList,
  UserCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  History,
  ChevronRight,
  UploadCloud,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { UserProfile } from '../../api/client';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
  onEnterWorkspace?: () => void;
  currentUser?: UserProfile | null;
}

/* ── 4-Step Scrutiny Workflow ────────────────────────────────────────── */
const WORKFLOW_STEPS = [
  {
    step: '01',
    name: 'Submit',
    title: 'Create & Upload',
    description:
      'Create an institutional application and upload its supporting documents through a structured regulatory intake dossier.',
    tag: 'Step 01',
    icon: UploadCloud,
    accentColor: '#6941C6',
    accentText: '#5631A8',
    surfaceBg: '#F3EEFF',
    borderColor: '#DCD0F7',
    iconBg: '#FFFFFF',
  },
  {
    step: '02',
    name: 'Extract',
    title: 'Extract & Understand',
    description:
      'Extract available document text and present the results for inspection. Page-level OCR statuses and parsing confidence are preserved.',
    tag: 'Step 02',
    icon: FileSearch,
    accentColor: '#3156A6',
    accentText: '#1E3A8A',
    surfaceBg: '#EEF4FF',
    borderColor: '#C7D7FE',
    iconBg: '#FFFFFF',
  },
  {
    step: '03',
    name: 'Validate',
    title: 'Validate & Identify',
    description:
      'Apply configured validation rules and highlight missing requirements or discrepancies with direct evidence references.',
    tag: 'Step 03',
    icon: Layers,
    accentColor: '#5145CD',
    accentText: '#4338CA',
    surfaceBg: '#F0F0FF',
    borderColor: '#D4D4FF',
    iconBg: '#FFFFFF',
  },
  {
    step: '04',
    name: 'Review',
    title: 'Review & Report',
    description:
      'Allow authorized reviewers to examine evidence, record permitted decisions, and access available scrutiny reports.',
    tag: 'Step 04',
    icon: ClipboardList,
    accentColor: '#15803D',
    accentText: '#166534',
    surfaceBg: '#ECFDF3',
    borderColor: '#BBF7D0',
    iconBg: '#FFFFFF',
  },
];

/* ── 6 Verifiable Capabilities ───────────────────────────────────────── */
const CAPABILITIES = [
  {
    icon: FileText,
    title: 'Document Processing',
    category: 'Ingestion & Extraction',
    body: 'Structured intake, multi-format validation, and automated text extraction with per-document status tracking across PDF and scanned filings.',
    accentColor: '#6941C6',
    accentBg: '#F3EEFF',
    accentBorder: '#DCD0F7',
    iconColor: '#6941C6',
    pillText: 'Extraction',
  },
  {
    icon: ShieldCheck,
    title: 'Configurable Validation',
    category: 'Statutory Criteria',
    body: 'Deterministic checks for statutory land area, faculty ratios, AISHE identifiers, mandatory attachments, and temporal validity.',
    accentColor: '#1D4ED8',
    accentBg: '#EFF6FF',
    accentBorder: '#BFDBFE',
    iconColor: '#1D4ED8',
    pillText: 'Validation',
  },
  {
    icon: AlertTriangle,
    title: 'Discrepancy Detection',
    category: 'Cross-Checking',
    body: 'Rule-based cross-document comparison identifying conflicting declarations between titles, disclosures, and institutional registrations.',
    accentColor: '#D97706',
    accentBg: '#FFFBEB',
    accentBorder: '#FDE68A',
    iconColor: '#B45309',
    pillText: 'Anomaly Flags',
  },
  {
    icon: FileSearch,
    title: 'Evidence-Linked Review',
    category: 'Provenance Links',
    body: 'Every finding references the exact source document, page number, candidate extracted value, and governing evaluation rule.',
    accentColor: '#7C3AED',
    accentBg: '#F5F3FF',
    accentBorder: '#DDD6FE',
    iconColor: '#7C3AED',
    pillText: 'Traceability',
  },
  {
    icon: History,
    title: 'Audit Trail',
    category: 'Accountability',
    body: 'Append-only chronological audit logging recording every document upload, evaluation run, and reviewer action for legal accountability.',
    accentColor: '#0891B2',
    accentBg: '#ECFEFF',
    accentBorder: '#A5F3FC',
    iconColor: '#0E7490',
    pillText: 'Append-Only',
  },
  {
    icon: ClipboardList,
    title: 'Scrutiny Reports',
    category: 'Executive Summary',
    body: 'Comprehensive, structured scrutiny summaries compiling document statuses, validation results, and reviewer determinations for board review.',
    accentColor: '#15803D',
    accentBg: '#F0FDF4',
    accentBorder: '#BBF7D0',
    iconColor: '#15803D',
    pillText: 'Reporting',
  },
];

export const LandingPage: React.FC<Props> = ({
  onGetStarted,
  onSignIn,
  onEnterWorkspace,
  currentUser,
}) => {
  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#111827] relative selection:bg-[#E9D8FD] selection:text-[#581C87]">
      {/* ── Accessible Skip to Main Content Link (GIGW 3.0 / WCAG 2.4.1) ─ */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── SIH Institutional Banner ─────────────────────────────────── */}
      <div className="bg-[#172554] text-white px-4 py-1.5 text-[11px] relative z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1E3A8A] text-blue-200 border border-[#2563EB]/40 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Smart India Hackathon 2026
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Smart Automation Track · AI-Assisted Institutional Application Scrutiny
            </span>
          </div>
          <span className="text-slate-400 text-[10px]">
            Prototype Demonstration · Synthetic Data Only
          </span>
        </div>
      </div>

      {/* ── Public Navigation Header ─────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#E4E7EC] sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Brand */}
          <VerityAIExcelLogo size="md" />

          {/* Center: Navigation Links */}
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#667085]">
            <a
              href="#how-it-works"
              className="hover:text-[#111827] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#capabilities"
              className="hover:text-[#111827] transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#governance"
              className="hover:text-[#111827] transition-colors"
            >
              Governance &amp; Trust
            </a>
          </nav>

          {/* Right: Auth Triggers */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <button
                onClick={onEnterWorkspace || onGetStarted}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#6941C6] text-white hover:bg-[#5631A8] transition-colors shadow-xs cursor-pointer"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#374151] hover:bg-[#F5F0FF] hover:text-[#6941C6] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetStarted}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#6941C6] text-white hover:bg-[#5631A8] transition-colors shadow-xs cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Landmark ────────────────────────────────────────────── */}
      <main id="main-content" tabIndex={-1} className="outline-none">

      {/* ── Hero Section (Split-Screen with Curved Background Accents) ─ */}
      <section className="relative pt-10 sm:pt-16 pb-20 px-4 sm:px-8 overflow-hidden">
        {/* Soft curved organic background shape behind the hero preview */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[-10%] w-[680px] h-[680px] rounded-full bg-gradient-to-br from-[#F3EEFF]/80 via-[#EEF4FF]/50 to-transparent blur-3xl opacity-75 -z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-40 left-[-5%] w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-[#F0F0FF]/60 via-[#F3EEFF]/40 to-transparent blur-2xl opacity-60 -z-10"
        />

        {/* Subtle SVG organic wave divider accent at bottom edge of hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 text-white/50 -z-10 overflow-hidden leading-none"
        >
          <svg
            viewBox="0 0 1440 48"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full text-white"
          >
            <path
              d="M0 48H1440V24C1200 4 960 40 720 20C480 0 240 32 0 16V48Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Heading, Value Proposition, and CTAs */}
            <div className="lg:col-span-6 space-y-6">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F0FF] border border-[#DDD6FE] text-[11px] font-bold text-[#6941C6] uppercase tracking-wider shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6941C6]" />
                Institutional Application Scrutiny
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111827] tracking-tight leading-[1.1]">
                Institutional Scrutiny,{' '}
                <span className="text-[#6941C6]">Made Clearer.</span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-sm sm:text-base text-[#667085] leading-relaxed max-w-xl">
                Review institutional applications with structured document extraction,
                configurable validation rules, discrepancy detection, and evidence-linked
                findings — all within an accountable, human-supervised regulatory workflow.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#6941C6] text-white hover:bg-[#5631A8] transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  <span>{currentUser ? 'Enter Workspace' : 'Get Started'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white border border-[#E4E7EC] text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D0D5DD] transition-all shadow-2xs cursor-pointer"
                >
                  <span>How It Works</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Trust & Ethics Note */}
              <div className="pt-2 flex items-center gap-2 text-xs text-[#667085]">
                <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
                <span>
                  Designed for regulatory reviewers. Final statutory decisions remain human-led.
                </span>
              </div>
            </div>

            {/* Right Column: Purpose-Built Illustrative Hero UI Composition */}
            <div className="lg:col-span-6 relative">
              {/* Subtle organic halo behind the card */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 bg-gradient-to-r from-[#DDD6FE]/30 via-[#BFDBFE]/20 to-[#BBF7D0]/20 rounded-3xl blur-lg -z-10"
              />

              {/* Elegant illustrative banner above card */}
              <div className="mb-2 flex items-center justify-between px-1 text-[11px]">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3EEFF] border border-[#DCD0F7] text-[#6941C6] font-bold text-[10px] tracking-wide uppercase">
                  <Sparkles className="w-3 h-3 text-[#6941C6]" />
                  <span>ILLUSTRATIVE SCRUTINY PREVIEW</span>
                </div>
                <span className="text-[10px] font-medium text-[#667085] bg-white/80 px-2 py-0.5 rounded-md border border-[#E4E7EC]">
                  Synthetic demonstration data
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-md p-5 sm:p-6 space-y-4 relative">
                {/* 1. Institutional Application Header */}
                <div className="flex items-start justify-between pb-3.5 border-b border-[#E4E7EC] gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#6941C6] bg-[#F5F0FF] px-2 py-0.5 rounded border border-[#DDD6FE]">
                        APP-2026-0841
                      </span>
                      <span className="text-[10px] font-semibold text-[#667085] bg-[#F9FAFB] px-2 py-0.5 rounded border border-[#E4E7EC]">
                        AISHE: C-41829 (Demo)
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#111827] mt-1.5">
                      St. Xavier Institute of Technology &amp; Management
                    </div>
                    <div className="text-[11px] text-[#667085]">
                      Category: Technical Campus Approval (AY 2026–27) · Example Filing
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] animate-pulse" />
                      UNDER SCRUTINY
                    </span>
                    <div className="text-[9px] text-[#9CA3AF] mt-0.5 font-medium">
                      Simulated State
                    </div>
                  </div>
                </div>

                {/* 2. Document Extraction Status Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#374151] uppercase tracking-wider text-[10px]">
                      Document Extraction &amp; OCR Status
                    </span>
                    <span className="text-[#6941C6] font-medium font-mono text-[10px] bg-[#F5F0FF] px-1.5 py-0.5 rounded">
                      2 / 2 Verified (Demo OCR)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#111827] truncate text-[11px]">
                          Land Ownership Deed
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                      </div>
                      <div className="text-[10px] text-[#667085] flex items-center justify-between">
                        <span>14 Pages Parsed</span>
                        <span className="font-mono font-bold text-[#15803D]">98.4% conf</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#111827] truncate text-[11px]">
                          AICTE Mandatory Disclosure
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                      </div>
                      <div className="text-[10px] text-[#667085] flex items-center justify-between">
                        <span>8 Pages Parsed</span>
                        <span className="font-mono font-bold text-[#15803D]">96.1% conf</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Validation Rules Assessment */}
                <div className="space-y-2 pt-1">
                  <span className="font-bold text-[#374151] uppercase tracking-wider text-[10px]">
                    Deterministic Rule Assessment
                  </span>

                  <div className="space-y-1.5 text-xs">
                    {/* Passed Rule */}
                    <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-bold text-[#15803D] text-[11px] flex items-center gap-1.5">
                          <span>VAL-LAND-01: Contiguous Land Area ≥ 5.0 Acres</span>
                        </div>
                        <div className="text-[10px] text-[#166534] truncate">
                          Extracted Value: 7.42 acres (Survey Record #SR-409/2024)
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shrink-0">
                        PASSED
                      </span>
                    </div>

                    {/* Flagged Rule */}
                    <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-bold text-[#B45309] text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                          <span>VAL-FAC-03: Faculty Cadre Ratio ≥ 1:20</span>
                        </div>
                        <div className="text-[10px] text-[#92400E] truncate">
                          Candidate Ratio: 1:22.4 · Flagged for reviewer inspection
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D] shrink-0">
                        NEEDS REVIEW
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Evidence-Linked Finding Citation */}
                <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#DDD6FE] space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#6941C6] uppercase">
                    <span className="flex items-center gap-1">
                      <FileSearch className="w-3.5 h-3.5" />
                      Traceable Evidence Link
                    </span>
                    <span className="font-mono">Doc #DOC-2026-4401</span>
                  </div>
                  <p className="text-[11px] text-[#4C1D95] leading-relaxed">
                    Page 4, Clause 3.2: Declared built-up education area (14,250 sq.m) matches
                    Municipal Sanction Certificate #MC-2025-110.
                  </p>
                </div>

                {/* 5. Reviewer Sign-Off Footer */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-[#667085] border-t border-[#E4E7EC]">
                  <div className="flex items-center gap-1.5 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>Officer: K. Ramanathan (Demo Scrutiny Lead)</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#6B7280] font-semibold bg-[#F3F4F6] px-2 py-0.5 rounded">
                    Pending Human Determination
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── How It Works (4 Coordinated Distinct Cards with Subtle Curve) ─ */}
      <section id="how-it-works" className="py-20 px-4 sm:px-8 bg-white border-y border-[#E4E7EC] relative overflow-hidden">
        {/* Soft background tint shape for section definition */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-64 bg-gradient-to-b from-[#FAF8FF] to-transparent -z-10"
        />

        <div className="max-w-7xl mx-auto space-y-12 relative">
          {/* Section Header with subtle decorative pill */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F3EEFF] border border-[#DCD0F7] text-xs font-bold text-[#6941C6] uppercase tracking-wider">
              Scrutiny Methodology
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
              How VerityAI Excel Works
            </h2>
            <p className="text-xs sm:text-sm text-[#667085]">
              A four-stage verifiable workflow from institutional intake to evidence-linked determination.
            </p>
          </div>

          {/* 4-Step Coordinated Distinct Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((s, idx) => {
              const StepIcon = s.icon;
              return (
                <div
                  key={s.step}
                  className="workflow-card rounded-2xl border p-6 space-y-4 relative flex flex-col justify-between"
                  style={{
                    backgroundColor: s.surfaceBg,
                    borderColor: s.borderColor,
                  }}
                >
                  <div className="space-y-4">
                    {/* Top Row: Prominent Step Number, Step Badge & Icon */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-2xl font-black tracking-tight"
                          style={{ color: s.accentColor }}
                        >
                          {s.step}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider"
                          style={{
                            color: s.accentText,
                            backgroundColor: '#FFFFFF',
                            borderColor: s.borderColor,
                          }}
                        >
                          {s.name}
                        </span>
                      </div>

                      {/* Icon Container with subtle micro-interaction */}
                      <div
                        className="workflow-icon w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs border"
                        style={{
                          backgroundColor: s.iconBg,
                          borderColor: s.borderColor,
                          color: s.accentColor,
                        }}
                      >
                        <StepIcon className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Step Title & Description */}
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-[#172033]">
                        {s.title}
                      </h3>
                      <p className="text-xs text-[#667085] leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>

                  {/* Subtle progression connector / footer indicator */}
                  <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-[10px] font-semibold text-[#667085]">
                    <span className="font-mono uppercase">{s.tag}</span>
                    {idx < WORKFLOW_STEPS.length - 1 ? (
                      <span className="inline-flex items-center text-[10px] text-[#9CA3AF] gap-0.5 font-sans">
                        <span>Next</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] text-[#15803D] gap-0.5 font-sans font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Decision</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Statutory Decisions Note */}
          <div className="text-center">
            <p className="text-xs text-[#667085] flex items-center justify-center gap-1.5 bg-[#FAF8FF] py-2.5 px-4 rounded-xl border border-[#E9E6F2] max-w-2xl mx-auto">
              <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
              <span>
                <strong>Human-in-the-Loop Guarantee:</strong> The system surfaces facts and flags anomalies.
                Final statutory determinations remain human-led.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Capabilities (6 Verifiable Items) ───────────────────────── */}
      <section id="capabilities" className="py-20 px-4 sm:px-8 bg-[#F7F8FC] relative">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F5F0FF] border border-[#DDD6FE] text-xs font-bold text-[#6941C6] uppercase tracking-wider">
              Core Capabilities
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
              Engineered for Regulatory Integrity
            </h2>
            <p className="text-xs sm:text-sm text-[#667085]">
              Deterministic validation, page-level provenance, and evidence-linked findings.
            </p>
          </div>

          {/* 6 Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="capability-card bg-white rounded-2xl border border-[#E4E7EC] p-6 space-y-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
                  style={{
                    borderTop: `3px solid ${cap.accentColor}`,
                  }}
                >
                  <div className="space-y-3.5">
                    {/* Header Row: Colored Icon & Category Badge */}
                    <div className="flex items-center justify-between">
                      <div
                        className="capability-icon w-11 h-11 rounded-xl flex items-center justify-center shadow-2xs border"
                        style={{
                          backgroundColor: cap.accentBg,
                          borderColor: cap.accentBorder,
                          color: cap.iconColor,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase"
                        style={{
                          backgroundColor: cap.accentBg,
                          borderColor: cap.accentBorder,
                          color: cap.iconColor,
                        }}
                      >
                        {cap.pillText}
                      </span>
                    </div>

                    {/* Title & Category */}
                    <div>
                      <div className="text-[11px] font-semibold text-[#8589A6] uppercase tracking-wider">
                        {cap.category}
                      </div>
                      <h3 className="text-base font-bold text-[#111827] mt-0.5">
                        {cap.title}
                      </h3>
                    </div>

                    {/* Body */}
                    <p className="text-xs text-[#5F6485] leading-relaxed">
                      {cap.body}
                    </p>
                  </div>

                  {/* Subtle verified check footer */}
                  <div className="pt-3 border-t border-[#F2F4F7] flex items-center justify-between text-[11px] text-[#667085]">
                    <span className="text-[10px] font-medium text-[#8589A6]">
                      Built-in Scrutiny Rule
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: cap.accentColor }}
                    >
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Governance & Trust Section ──────────────────────────────── */}
      <section id="governance" className="py-16 px-4 sm:px-8 bg-white border-t border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto bg-[#F9FAFB] rounded-2xl border border-[#E4E7EC] p-6 sm:p-8 space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#111827]">
                Regulatory Accountability &amp; Trust Principles
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                VerityAI Excel is designed as decision support software. It adheres strictly to AICTE prototype
                guidelines: all document findings are evidence-linked with document IDs and page numbers,
                validation rules are deterministic, external registry checks are explicitly labeled when simulated,
                and no adverse decision is executed autonomously by AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final Call to Action ────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-8 bg-[#172554] text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E3A8A] text-blue-200 border border-[#2563EB]/40 text-[11px] font-semibold">
            Ready for Evaluation
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Explore VerityAI Excel?
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Enter the scrutiny workspace using authorized demonstration credentials to review applications,
            inspect extracted document findings, and evaluate the compliance workflow.
          </p>

          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-[#6941C6] text-white hover:bg-[#5631A8] transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <span>Enter the Scrutiny Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      </main>

      {/* ── Minimal Institutional Footer ────────────────────────────── */}
      <footer className="bg-white border-t border-[#E4E7EC] py-6 px-4 sm:px-8 text-xs text-[#667085]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="font-bold text-[#111827]">VerityAI Excel</div>
            <p className="text-[11px] text-[#9CA3AF] max-w-md">
              Institutional application scrutiny platform. Prototype built for Smart India Hackathon 2026.
              Operates on synthetic and authorized test data only.
            </p>
          </div>

          <div className="text-[11px] text-[#9CA3AF]">
            Decision Support System · Not an Official AICTE Production Deployment
          </div>
        </div>
      </footer>
    </div>
  );
};
