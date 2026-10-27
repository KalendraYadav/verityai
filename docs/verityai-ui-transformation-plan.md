# VerityAI Complete UI Transformation Plan (Linea Edition)

**Target:** 99% fidelity to Linea's design language, aesthetic character, and interaction philosophy.  
**Execution Scope:** Full stack frontend redesign across Public Landing, App Shell, Applicant, Reviewer, and Admin portals.  

---

## 1. Core Architecture Upgrades

1. **Global CSS & Font Ingestion:**
   - Ingest Google Fonts: `Host Grotesk` (weights 300, 400, 500, 600, 700, 800) into `index.html` and `src/index.css`.
   - Redefine semantic tokens in `src/index.css` using Linea colors:
     - `background`: `#FAF5F0` (warm paper)
     - `foreground`: `#1B1411` (deep espresso noir)
     - `primary`: `#33CC7A` (mint emerald)
     - `primary-foreground`: `#1B1411` (dark text on mint)
     - `card`: `#FFFFFF` with warm sand borders (`#EEE5DC`)
     - `card-foreground`: `#1B1411`
     - `muted`: `#EEE5DC`
     - `muted-foreground`: `#66574F`
     - `border`: `rgba(27, 20, 17, 0.12)`
     - `dark-surface`: `#1B1411`
     - `navy-surface`: `#1F3954`

2. **Primitive & Common Components:**
   - [src/components/common/StatusBadge.tsx](file:///d:/web%20project/VerityAI/frontend/src/components/common/StatusBadge.tsx): Rebuilt with Linea's pill radii, subtle pastel fills, and organic status icons.
   - [src/components/common/StatCard.tsx](file:///d:/web%20project/VerityAI/frontend/src/components/common/StatCard.tsx): Rebuilt with high-contrast typography, tight tracking, and warm paper elevation.
   - [src/components/common/EmptyState.tsx](file:///d:/web%20project/VerityAI/frontend/src/components/common/EmptyState.tsx): Rebuilt with editorial typography and tactile pill action buttons.

3. **Public Landing Page Transformation (`src/components/landing/LandingPage.tsx`):**
   - Recreate the Linea visual signature:
     - Floating dark pill navigation bar (`#1B1411/85` with backdrop blur, brand icon, section anchors, and emerald pill button).
     - Full-bleed hero with midnight slate-navy background (`#1F3954` to `#13253B`), massive Host Grotesk headline ("Every statutory filing, verified to its source."), and floating conversational/dossier chips riding curved hairline vectors.
     - Dual-block comparison section ("Applicant Declares" in espresso `#1B1411` vs "VerityAI Verifies" in vibrant emerald `#33CC7A`).
     - Large rounded-3xl showcase card with institutional scrutiny preview and deterministic rule breakdown.
     - Refined editorial typography and footer.

4. **App Shell Transformation (`src/components/layout/AppShell.tsx`):**
   - Rebuild the sidebar and top navigation:
     - Warm sand/paper background (`#F5EFEB`), dark espresso logo badge, soft rounded-full menu items, pill active states.
     - Top bar with floating search pill, live backend health indicator, role badges, and account profile dropdown.
     - Responsive mobile drawer (`Sheet`) adopting the same warm paper and espresso design language.

5. **Portal Views Transformation:**
   - **Applicant Portal (`ApplicantDashboardView`, `ApplicantStatusView`):**
     - Hero card with dark slate navy tone, mint action button, and clear statutory status pills.
     - High-density application table with warm sand headers, monospace application numbers, and quick edit buttons.
   - **Reviewer Portal (`DashboardView`, `ScrutinyQueueView`, `ApplicationList`):**
     - Operational metrics with Host Grotesk figures and trend chips.
     - Scrutiny queue with prioritized indicators, blocker tags, and high-visibility examine buttons.
   - **Application Detail Workspace (`ApplicationDetailWorkspace.tsx`):**
     - Identity header with full-pill lifecycle status.
     - Persistent scrutiny job progress bar with mint accent.
     - 5-stage workflow stepper with active emerald checkmarks.
     - Dual-pane evidence inspector: raw declared parameters vs. extracted PDF proof with page citations.
   - **Admin & Governance (`AdminDashboardView`, `UsersView`, `AuditTimelineView`, `RegistryVerificationView`, `ValidationComplianceView`):**
     - Unified under the Linea warm paper and deep espresso design system.
     - Explicit simulated sandbox disclosures and immutable cryptographic hash trails.

---

## 2. Regression Protection Checklist

- Zero modification of backend database models, migrations, or Python logic.
- Zero tampering with authentication cookies, CSRF tokens, or RBAC route guards.
- All real API integration calls, polling hooks, and RapidOCR/PyMuPDF outputs preserved.
- Verified build and lint pipeline (`npm run build` & `npm run lint`) at every milestone.
