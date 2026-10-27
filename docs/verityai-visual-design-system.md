# VerityAI Visual Design System (Linea-Inspired Editorial Edition)

**Derived From:** [21st.dev Linea Template](https://21st.dev/@8b/templates/linea-app-landing-page-template)  
**Standard:** Institutional Decision Support · Smart India Hackathon 2026  
**Status:** Canonical Visual Foundation  

---

## 1. Design Philosophy: Warm Institutional Modernism

Most government and regulatory software feels either dated and sterile or cheapened by generic purple-neon AI templates. 
VerityAI's new visual design system establishes **Warm Institutional Modernism**:
- **Dignified & Authoritative:** Built on deep espresso noir (`#1B1411`) and slate navy (`#1F3954`) that command respect without intimidation.
- **Tactile & Human:** Warm ivory/paper surfaces (`#FAF5F0`) and warm sand neutrals (`#EEE5DC`) that reduce eye fatigue during hours of rigorous scrutiny.
- **Vivid, Honest Verification:** A signature spring emerald (`#33CC7A`) signifying clean compliance, paired with clear amber (`#D97706`) and crimson (`#DC2626`) for deficiency and anomaly warnings.
- **Editorial Typography:** High-contrast, tightly tracked grotesque typography (**Host Grotesk**) paired with clean monospaced technical references.

---

## 2. Centralized Color Tokens & CSS Variables

```css
:root {
  /* Linea Warm Paper Canvas */
  --canvas-paper: #FAF5F0;
  --canvas-paper-subtle: #F5EFEB;
  --canvas-sand: #EEE5DC;
  --canvas-sand-dark: #E2D7CC;

  /* Linea High-Contrast Dark Surfaces */
  --surface-espresso: #1B1411;
  --surface-espresso-card: #2E241F;
  --surface-navy: #1F3954;
  --surface-navy-card: #182C40;

  /* Typography Colors */
  --text-noir: #1B1411;
  --text-umber: #66574F;
  --text-sand: #FAF5F0;
  --text-ice: #BACDE0;
  --text-muted-dark: #B8ABA3;

  /* Functional & Semantic Tokens */
  --accent-mint: #33CC7A;
  --accent-mint-hover: #2BB66C;
  --accent-mint-glow: rgba(51, 204, 122, 0.25);

  --status-pass: #33CC7A;
  --status-pass-bg: rgba(51, 204, 122, 0.12);
  --status-review: #D97706;
  --status-review-bg: rgba(217, 119, 6, 0.12);
  --status-fail: #DC2626;
  --status-fail-bg: rgba(220, 38, 38, 0.12);
  --status-simulated: #1F3954;
  --status-simulated-bg: rgba(31, 57, 84, 0.10);

  /* Hairlines and Borders */
  --border-paper: rgba(27, 20, 17, 0.10);
  --border-paper-strong: rgba(27, 20, 17, 0.18);
  --border-dark: rgba(250, 245, 240, 0.12);
  --border-dark-strong: rgba(250, 245, 240, 0.22);

  /* Radii */
  --radius-hero: 3.5rem;    /* 56px */
  --radius-card: 1.75rem;   /* 28px */
  --radius-pill: 62.5rem;   /* 1000px */
  --radius-panel: 1.25rem;  /* 20px */
  --radius-sm: 0.625rem;    /* 10px */
}
```

---

## 3. Typography Architecture

### Font Families
- **Display & Interface:** `'Host Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace & Cryptographic:** `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`

### Scale & Hierarchy
1. **Display Hero:** `clamp(2.75rem, 5.5vw, 5.5rem)`, weight `700`, line-height `0.96`, tracking `-0.045em`.
2. **Page & Section Title:** `clamp(1.75rem, 3.2vw, 3rem)`, weight `600`, line-height `1.1`, tracking `-0.035em`.
3. **Card & Module Title:** `1.25rem` (20px), weight `600`, line-height `1.3`, tracking `-0.02em`.
4. **Body & Workload Content:** `0.9375rem` (15px), weight `400` / `500`, line-height `1.55`.
5. **Caption, Tag & Sub-metric:** `0.8125rem` (13px), weight `500`, line-height `1.4`.
6. **Monospace Hashes & Rules:** `0.75rem` (12px), weight `500`, tracking `0.02em`.

---

## 4. Component Patterns

### A. Navigation & Shell
- Floating pill header for Public Landing (`rgba(27, 20, 17, 0.85)` + `backdrop-blur-md`).
- Integrated institutional sidebar for authenticated portal with warm paper tone (`#F5EFEB`), dark espresso active indicator, and full-pill category tags.

### B. Action Buttons
- **Primary Linea Pill:** Full pill (`rounded-full`), vivid mint background (`#33CC7A`), espresso text (`#1B1411`), font weight `600`, subtle mint elevation glow.
- **Secondary Dark Pill:** Full pill, espresso background (`#1B1411`), warm paper text (`#FAF5F0`), hover lighten.
- **Ghost Warm Pill:** Full pill, transparent with sand border (`border-paper`), hover background `rgba(27, 20, 17, 0.05)`.

### C. Data Presentation
- **Editorial Dual-Pane:** Left pane in dark espresso (`#1B1411`) showing raw applicant declarations or original PDF excerpts; right pane in warm paper (`#FAF5F0`) showing deterministic rule verification and evidence citation.
- **Tactile Tables:** Sand header rows (`#EEE5DC`), subtle border lines, monospace reference pills, and clean hover states.
- **Explainability Cards:** Dedicated evidence blocks displaying exact Expected vs. Observed statutory criteria with document page link chips.
