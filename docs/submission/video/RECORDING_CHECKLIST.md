# VerityAI / EntityLocker — Video Recording & Production Checklist

**Project:** VerityAI / EntityLocker (Smart India Hackathon 2026, Smart Automation Track)  
**Deliverable File:** `docs/submission/video/RECORDING_CHECKLIST.md`  

---

## 1. Pre-Recording Environment Setup

- [x] **Backend Server Check:**
  - Verify Python 3.12 environment in `backend/.venv`.
  - Confirm all 121 backend unit/integration tests pass (`pytest backend/tests`).
  - Launch backend server via Uvicorn on `http://127.0.0.1:8000`.
  - Verify `/health` endpoint returns `{"status": "healthy", "database": {"status": "healthy"}}`.
- [x] **Frontend Server Check:**
  - Confirm clean production build (`npm run build` succeeds with 0 errors).
  - Launch Vite development server on `http://localhost:5173`.
  - Ensure API proxy in `vite.config.ts` routes `/api` to `http://127.0.0.1:8000`.
- [x] **Demonstration Data Seeding:**
  - Run synthetic seeding script: `python -m app.db.seed`.
  - Verify 3 synthetic dossiers exist:
    - `VAI-2026-0001` (Apex Institute of Technology, Pune — Compliant baseline)
    - `VAI-2026-0002` (Zenith College of Engineering, Bengaluru — Bilingual discrepancy)
    - `VAI-2026-0003` (Aryavart Polytechnic Institute, Delhi — Draft baseline)
  - Verify generated PDF certificates exist in storage:
    - `Apex_AICTE_Extension_of_Approval_2026.pdf`
    - `Apex_Contiguous_Land_Certificate.pdf`
    - `Zenith_Bilingual_AICTE_Approval_Devanagari.pdf`
- [x] **Demonstration User Accounts:**
  - Reviewer: `reviewer@verityai.gov.in` (`ReviewerPass123!`)
  - Admin: `admin@verityai.gov.in` (`AdminSecurePass123!`)
  - Operator: `operator@verityai.gov.in` (`OperatorPass123!`)

---

## 2. Browser & Visual Presentation Configuration

- [x] **Browser Window:**
  - Clean Chromium browser profile without personal bookmarks, extensions, or developer tools open.
  - Viewport set to standard 16:9 aspect ratio (1920 × 1080 resolution).
  - Browser zoom level set to 100% (default).
- [x] **Privacy & Secret Hygiene:**
  - Confirm no terminal windows exposing secrets, passwords, or host paths are visible.
  - Verify that synthetic disclaimer banners remain clearly legible across all views.
- [x] **Cursor & Navigation Pacing:**
  - Smooth, deliberate mouse cursor movements; avoid rapid or jittery dragging.
  - Allow 2–3 seconds pause on critical findings so evaluators can read the text and evidence citations.
  - Restrained transitions between views without unnecessary clicking.

---

## 3. Audio & Narration Standards

- [x] **Audio Level:** Target -14 to -18 LUFS for voice narration.
- [x] **Clarity:** Noise gate applied; zero microphone hum or background echo.
- [x] **Pronunciation:**
  - AICTE pronounced as "A-I-C-T-E" (letter by letter).
  - AISHE pronounced as "A-I-S-H-E".
  - Devanagari pronounced as "Day-vah-nah-gah-ree".
  - PyMuPDF pronounced as "Pie-Mew-P-D-F".
- [x] **Synchronization:** Narration timestamps precisely synchronized with on-screen actions in `VIDEO_SCRIPT.md`.

---

## 4. Post-Production & Quality Verification

- [x] Container: MP4 (`.mp4`) with H.264 video encoding and AAC stereo audio.
- [x] Frame Rate: 30 fps or 60 fps standard.
- [x] Total Duration: Between 3 minutes 30 seconds and 5 minutes 0 seconds.
- [x] Test Playback: Confirmed playback on standard desktop media players (VLC, Windows Media Player) and browser HTML5 video players.

---

*Verified and ready for demonstration capture.*
