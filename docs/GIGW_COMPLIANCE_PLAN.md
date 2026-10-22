# VerityAI Excel — GIGW 3.0 Compliance & Accessibility Plan

**Product:** VerityAI Excel  
**Classification:** Institutional Decision-Support Prototype (Smart India Hackathon 2026, Smart Automation Track)  
**Standard Benchmarks:** Guidelines for Indian Government Websites and Apps (GIGW 3.0), WCAG 2.1 Level AA, CERT-In / ISO 27001 baseline principles.

---

## 1. Audit Scope & Objectives

The purpose of this plan is to evaluate VerityAI Excel against relevant GIGW 3.0 quality, accessibility, cybersecurity, and lifecycle requirements, identifying genuine gaps and outlining safe, non-destructive remediation.

### Guidelines Mapping & Categorization
Under GIGW 3.0, requirements for this application fall into four distinct tiers:

1. **Directly Applicable (Tier 1):**
   - **WCAG 2.1 Level AA Accessibility:** Color contrast (minimum 4.5:1), keyboard operability, visible focus indicators, skip-to-content bypass blocks, dynamic descriptive page titles (`<title>`), explicit form control labels (`htmlFor`/`id`), semantic HTML5 landmarks (`<main>`, `<header>`, `<nav>`, `<footer>`), responsive design without horizontal scrolling or truncation down to 320px, and `prefers-reduced-motion` compliance.
   - **Quality & Usability:** Clear navigation hierarchy, human-in-the-loop statutory disclaimers, distinct identification of synthetic and simulated data, consistent status indicators.
   - **Cybersecurity Core:** Strict input validation, path traversal prevention, role-based access control, security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Referrer-Policy`), password mask toggles, avoidance of stack trace exposure.

2. **Applicable as Recommended Best Practice (Tier 2):**
   - Bilingual/Multilingual capabilities (English + Hindi/regional languages).
   - Structured audit trails with immutable event logs.
   - Consistent typography fallbacks and Unicode support.

3. **Conditionally Applicable (Tier 3):**
   - Real-time national registry integrations (DigiLocker, AISHE live APIs) — conditionally simulated in prototype with explicit labels.
   - Formal SSL/TLS certificates and domain validation (`gov.in` / `nic.in`) — applies upon deployment on government infrastructure.

4. **Not Applicable (Tier 4):**
   - Display of the National State Emblem of India (prohibited without official statutory authorization under State Emblem of India Act, 2005).
   - Official certification seals (e.g., STQC CQW Certified Quality Seal) — cannot be displayed without formal audit.

---

## 2. Identified Gaps & Remediation Strategy

| Area | Current Baseline | Verified Gap | Remediation Action | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Bypass Blocks (WCAG 2.4.1)** | No skip links existed | Keyboard users had to tab through all nav links to reach content | Added `.skip-link` in [index.css](file:///d:/web%20project/VerityAI/frontend/src/index.css) and skip anchors in both LandingPage and AppShell | **Fixed & Verified** |
| **Focus Visible (WCAG 2.4.7)** | Default browser focus outline | Focus outlines varied across elements | Added universal `*:focus-visible` with 2px solid accent and offset | **Fixed & Verified** |
| **Page Titled (WCAG 2.4.2)** | Static `<title>` tag for all routes | Switching between Overview, Queue, Documents, Login did not update browser tab | Added dynamic title sync effect in [App.tsx](file:///d:/web%20project/VerityAI/frontend/src/App.tsx) | **Fixed & Verified** |
| **Form Labels (WCAG 1.3.1 / 4.1.2)** | Login labels lacked `htmlFor` / `id` connection | Assistive tech could not programmatically link label to text input | Added `htmlFor`, `id`, `required`, and `aria-required` in [LoginPage.tsx](file:///d:/web%20project/VerityAI/frontend/src/components/auth/LoginPage.tsx) | **Fixed & Verified** |
| **Semantic Landmarks** | Landing page lacked `<main>` landmark | Screen readers could not navigate directly to main content region | Added semantic `<main id="main-content">` and `<nav aria-label="...">` | **Fixed & Verified** |
| **Reduced Motion (WCAG 2.3.3)** | CSS animations ran unconditionally | Users with vestibular motion sensitivities were impacted | Implemented `@media (prefers-reduced-motion: reduce)` across all animated cards | **Fixed & Verified** |

---

## 3. Testing & Verification Protocol

1. **Automated Backend Test Suite:** Run `pytest` across all 121 tests (auth, registry, documents, anomalies, security, reporting).
2. **Frontend Production Build:** Execute `npm run build` (`tsc -b && vite build`) to ensure zero type errors or bundle issues.
3. **Frontend Lint Check:** Execute `oxlint` across all frontend source files.
4. **Keyboard Accessibility Walkthrough:** Verify `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape` across skip links, navigation, modals, and login forms.
5. **Container Orchestration:** Verify Docker build and healthy container operation on ports 80/5173 and 8000.
