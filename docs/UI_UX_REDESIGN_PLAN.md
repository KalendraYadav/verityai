# VerityAI Excel — UI/UX Redesign Plan

**Phase 0 Audit + Implementation Plan** | Date: 2026-10-22

---

## 1. Current Problems (Confirmed by Audit)

### A. Product identity mismatch
- `EntityLockerLogo.tsx`: renders "EntityLocker" + "Powered by VerityAI"
- `AppShell.tsx` line 76: "EntityLocker Demo Environment"
- `AppShell.tsx` line 252: "EntityLocker — AI-Assisted Institutional..."
- `LandingPage.tsx`: EntityLockerLogo + EntityLocker copy throughout
- `index.html`: `<title>EntityLocker — VerityAI Scrutiny...`
- **Fix:** Rename product to "VerityAI Excel" throughout.

### B. App opens on dashboard, not landing
- `App.tsx` line 34: `useState('dashboard')` — default bypasses landing
- **Fix:** Change default to `'landing'`.

### C. AppShell chrome shown on landing page
- Landing page gets full sidebar + operational topbar with search
- No separation of public vs. authenticated experience
- **Fix:** Render landing outside the workspace AppShell.

### D. Flat, ungrouped navigation (9 items)
- All 9 nav items listed with no grouping or hierarchy
- **Fix:** Group into WORKSPACE / VERIFICATION / ADMINISTRATION sections.

### E. Landing page content problems
- Copy: "For Entities, Organizations and MSMEs" (wrong audience)
- Nav link: "AICTE Compliance" (unverified claim)
- Only 3 workflow steps (prompt requires 4)
- No governance/trust section

---

## 2. Existing Functionality to Preserve

| View | Component | Status |
|---|---|---|
| Overview/Dashboard | `DashboardView.tsx` | Implemented — real data |
| Applications list | `ApplicationList.tsx` | Implemented |
| Application detail | `ApplicationDetailWorkspace.tsx` | Implemented |
| Scrutiny queue | `ScrutinyQueueView.tsx` | Implemented |
| Documents | `DocumentsView.tsx` | Implemented |
| Validation rules | `ValidationComplianceView.tsx` | Implemented |
| Institutions | `EntitiesView.tsx` | Implemented |
| Registry verification | `RegistryVerificationView.tsx` | Implemented |
| Regulatory gateways | `RegulatoryGatewaysView.tsx` | Implemented |
| Audit trail | `AuditTimelineView.tsx` | Implemented |
| Auth (login/logout/change-pw) | `AuthModal.tsx` | Implemented with real API |
| Health check modal | `App.tsx` | Implemented |
| Application create | `ApplicationCreateModal.tsx` | Implemented |
| Document upload | `DocumentUploadModal.tsx` | Implemented |

**Demo accounts (real backend, seeded):**
- `admin@verityai.gov.in` / `AdminSecurePass123!`
- `reviewer@verityai.gov.in` / `ReviewerPass123!`

**Tech stack:**
- React 19 + Vite 8 + TypeScript 6
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Lucide React icons
- No URL router (tab-based SPA: `viewMode` + `currentTab` state)
- API client: `src/api/client.ts`

---

## 3. Proposed View Structure

```
viewMode='landing'   → LandingPage (standalone, no sidebar)
viewMode='dashboard' → WorkspaceShell (sidebar + topbar)
  currentTab='overview'       → DashboardView
  currentTab='applications'   → ApplicationList / ApplicationDetailWorkspace
  currentTab='scrutiny'       → ScrutinyQueueView
  currentTab='documents'      → DocumentsView
  currentTab='compliance'     → ValidationComplianceView
  currentTab='institutions'   → EntitiesView
  currentTab='registry'       → RegistryVerificationView
  currentTab='gateways'       → RegulatoryGatewaysView
  currentTab='audit'          → AuditTimelineView
```

---

## 4. Navigation Hierarchy

```
WORKSPACE
  Overview
  Applications
  Scrutiny Queue

VERIFICATION
  Documents
  Validation Rules
  Registry Verification

ADMINISTRATION
  Institutions
  Regulatory Gateways
  Audit Trail
```

---

## 5. Design System

**Palette (refining existing violet/navy direction):**
- Brand violet: `#6941C6` (primary — was #7450D8)
- Hover violet: `#5631A8`
- Accent light: `#F5F0FF`
- Navy dark: `#172554` (wordmark)
- Page bg: `#F7F8FC`
- Surface: `#FFFFFF`
- Text primary: `#111827`
- Text secondary: `#667085`
- Border: `#E4E7EC`
- Success: `#15803D`
- Warning: `#B45309`
- Error: `#B42318`

**Typography:** Inter (already loaded via Google Fonts)

---

## 6. Implementation Phases

1. **Brand rename** — New `VerityAIExcelLogo.tsx`, update `index.html`, AppShell banner
2. **Landing page** — Rewrite `LandingPage.tsx`: correct copy, 4-step workflow, governance section
3. **App.tsx** — Default to landing, separate public/workspace chrome
4. **AppShell** — Grouped nav, cleaner header, remove landing-page toggle from workspace
5. **Build + lint + test**

---

## 7. Validation Strategy

1. `npm run build` — 0 errors
2. `npm run lint` — 0 errors
3. Browser: `/` opens landing page (not dashboard)
4. "Get Started" / "Sign In" opens auth modal
5. Sign in → workspace opens
6. Sign out → landing returns
7. All 9 nav items open correct views
8. Browser console: no errors
