# Linea Reference Design Analysis & Reverse Engineering

**Reference Source:** [21st.dev Linea Template](https://21st.dev/@8b/templates/linea-app-landing-page-template)  
**Live Demo:** [8b.com/templates/linea/demo.html](https://8b.com/templates/linea/demo.html)  
**Author:** @8b  
**Reverse Engineering Date:** October 26, 2026  
**Auditor:** Principal Product Designer & Senior Design Systems Engineer  

---

## 1. Executive Summary

The Linea reference represents a breakthrough in contemporary software design: it departs completely from the generic, cold, purple-indigo-neon AI card interfaces that dominate hackathon and commercial SaaS prototypes. 

Instead, it embodies **tactile, warm editorial modernism**:
- **Warm Paper Foundation:** A luminous, physical-feeling ecru/warm paper canvas (`#FAF5F0`) paired with a slightly deeper sand tone (`#EEE5DC`).
- **High-Contrast Deep Noir & Slate:** Deep espresso charcoal (`#1B1411`) and rich slate navy (`#1F3954`) for high-authority, high-contrast hero regions and operational containers.
- **Vivid Mint / Emerald Spring Accent:** A lively, organic green accent (`#33CC7A`) that delivers high legibility and natural optimism without feeling artificial or neon.
- **Editorial Typography Scale (Host Grotesk):** Tight tracking (`-0.045em`), dramatic size contrast (`clamp(3rem, 6.4vw, 6rem)` down to `0.8125rem`), and asymmetric editorial grid layouts.
- **Curved Organic Hairlines & Floating Pill Header:** Floating translucent pill navigation (`#1B1411/80` with backdrop blur), full-pill buttons (`border-radius: 62.5rem`), and sweeping hairline connection paths.

---

## 2. Reverse-Engineered Design Tokens

Extracted directly from the computed styles and CSS layer tokens of `https://8b.com/templates/linea/demo.html`:

### A. Color Palette

| Token | Hex Value | Name | Usage & Role |
|---|---|---|---|
| `--color-1` | `#1B1411` | Deep Espresso Noir | Primary dark background, high-contrast dark text, dark buttons, dark card surfaces |
| `--color-2` | `#FAF5F0` | Warm Paper Ivory | Primary page background, light text when on dark surfaces, pure warm canvas |
| `--color-3` | `#EEE5DC` | Warm Sand Neutral | Secondary paper surfaces, table headers, border accents, input backgrounds |
| `--color-4` | `#33CC7A` | Mint Spring Emerald | Primary interactive accent, verified statutory status, primary action pill buttons |
| `--color-5` | `#66574F` | Muted Umber / Espresso | Muted body text on warm paper, secondary labels, subtle metadata |
| `--color-6` | `#1F3954` | Slate Navy / Midnight Ocean | Deep hero backgrounds, institutional workspace headers, authority containers |
| `--color-7` | `#BACDE0` | Ice Slate / Pale Cornflower | Muted supporting text when rendered on slate navy (`#1F3954`) surfaces |
| `--color-8` | `#2E241F` | Dark Warm Charcoal Card | Nested cards inside dark containers, contrast panels |
| `--color-9` | `#B8ABA3` | Warm Silver Gray | Subtle borders on dark containers, divider hairlines |

### B. Typography: Host Grotesk

The primary typeface is **Host Grotesk** (`https://fonts.gstatic.com/s/hostgrotesk/v5/co3BmWBnlCJ3U42vbbfdwMjZpFjm.woff2`), loaded with a local Arial/Helvetica fallback.

| Class / Style | Font Size | Weight | Line Height | Letter Spacing | Purpose in VerityAI |
|---|---|---|---|---|---|
| `.m-text-2` | `clamp(3rem, 6.4vw, 6rem)` | 600 | `0.96` | `-0.045em` | Hero display headings |
| `.m-text-3` | `clamp(2.25rem, 5.4vw, 5rem)` | 600 | `1.0` | `-0.04em` | Major section titles & portal headers |
| `.m-text-4` | `clamp(1.125rem, 1.35vw, 1.3125rem)` | 400 | `1.45` | `-0.01em` | Editorial lead text, value statements |
| `.m-text-5` | `clamp(1.1875rem, 1.6vw, 1.4375rem)` | 600 | `1.2` | `-0.02em` | Section headers, card titles |
| `.m-text` | `1.0625rem` (17px) | 400 | `1.55` | `0` | Standard long-form reading |
| `.m-text-6` | `0.9375rem` (15px) | 600 | `1.25` | `-0.005em` | Navigation links, button labels, table headers |
| `.m-text-7` | `0.8125rem` (13px) | 400 | `1.5` | `0` | Metadata, timestamps, page tags (78% opacity) |
| `.m-text-8` | `1.0rem` (16px) | 400 | `1.5` | `0` | Descriptions and explanations (76% opacity) |
| `font-mono` | `0.8125rem` (13px) | 500 | `1.4` | `0.02em` | SHA-256 hashes, AISHE codes, rule IDs |

### C. Spacing & Border Radii

- `--radius-1`: `3.5rem` (56px) — Large hero showcase cards & outer container wraps.
- `--radius-2`: `1.75rem` (28px) — Main content cards and modular review blocks.
- `--radius-3`: `62.5rem` (1000px) — Full pill buttons, filter pills, and navigation bars.
- `--radius-4`: `1.25rem` (20px) — Contextual dialogs, inner panels, table containers.
- `--space-1`: `clamp(1.125rem, 4.2vw, 3.5rem)` — Responsive inline gutter.
- `--space-2`: `clamp(5rem, 10vw, 9rem)` — Editorial section rhythm.

### D. Elevation & Shadows

- `--shadow-1`: `0 1.5rem 3rem -1.5rem color-mix(in srgb, #1B1411 60%, transparent)` — Heavy physical shadow for floating cards.
- `--shadow-2`: `0 0.75rem 1.75rem -0.75rem color-mix(in srgb, #33CC7A 85%, transparent)` — Soft organic emerald glow behind primary CTA pills.

---

## 3. Interaction & Motion Signature

1. **Floating Pill Navigation:**
   Positioned `top: 0.875rem`, centered with `max-width: 84rem`. Backed by dark translucent espresso (`rgba(27, 20, 17, 0.8)`), backdrop blur (`blur(16px)`), thin border (`rgba(250, 245, 240, 0.1)`), and emerald action button.
2. **Scroll-Linked Staged Reveals:**
   Dual-block comparisons ("They speak" in espresso vs "You read" in emerald) where audio waveforms translate into structured text bubbles.
3. **Stacked Card Progression:**
   Cards stack smoothly as the user scrolls, creating a tactile physical dossier feel.
4. **Button Wave Microinteractions:**
   Primary buttons feature smooth label translate on hover with a miniature animated sound/verification wave reveal.

---

## 4. Architectural Adaptation for VerityAI

In VerityAI, the Linea aesthetic translates into an institutional regulatory decision-support system:
- **Audio Waveforms → Document Extraction Streams:** Sound waves become document OCR text streams, bounding boxes, and statutory field tokens.
- **"They Speak" / "You Read" → "Applicant Declares" / "Evidence Verifies":** Left dark panel shows applicant self-declarations; right emerald/paper panel displays deterministic validation outcomes linked to source document page numbers.
- **Phone Showcase → Scrutiny Dossier Viewport:** The phone frame becomes the regulatory application inspector, featuring split-screen PDF page rendering and structured findings.
- **Pill Navigation & Badges:** Preserves institutional RBAC (Applicant, Reviewer, Admin) while delivering tactile, warm authority.
