# Umrah Quotation System V2 — Project Analysis Report

**Report date:** May 30, 2026  
**Last updated:** May 31, 2026 (Phase 1 features completed)  
**Prepared for:** Skyship Travels  
**Live site:** https://umrahcal.skyshiptravels.com  
**Repository:** https://github.com/Skyshiptravels/umrah-quotation-system  
**Stack:** Next.js 14, TypeScript, PostgreSQL (Supabase pooler), Vercel  

---

## Executive Summary

| Metric | Assessment (updated) |
|--------|----------------------|
| **Overall completion (core quotation workflow)** | **~95%** |
| **Overall completion (full product vision)** | **~88%** |
| **Production-ready for daily staff quotations** | **Yes** |
| **Production-ready for hotel self-service** | **Partial** (admin UI built; SUPER_ADMIN-only) |
| **Recommended status** | **Live / peak-season ready** after production migration `005` + smoke test |

Since the initial report, **Phase 1 launch features** were implemented and verified: **edit quotation**, **PDF export**, **draft auto-save**, **commissions dashboard**, and **quotation list filters**. Build passes (`npm run build`) and **19/19 tests** pass (`npm test`).

**Remaining production ops (not code):**

1. Run `node scripts/migrate.js` on production (includes migration **`005`** — `draft_form_json`, `updated_by`).
2. Confirm `seed-hotels-dual-pricing.js` + `fix-org-data.js` if hotel dropdowns empty.
3. One full live smoke test: create → edit → PDF → commissions after calculate.

---

## Changelog — What Was Added (May 31, 2026)

| Feature | Status | Key paths |
|---------|--------|-----------|
| **Edit quotation** | Done | `/quotations/[id]/edit`, `QuotationFormPage`, `replaceQuotationFull()` |
| **PDF export** | Done | `PDFQuotation.tsx` (jsPDF), button on detail page |
| **Draft auto-save** | Done | 30s server draft + localStorage; `draft_form_json` column |
| **Commissions dashboard** | Done | `/commissions`, `/admin/commissions`, `/api/commissions` |
| **Quotation list filters** | Done | Search, status, dates, sort on `/quotations` |
| **Soft delete drafts** | Done | `DELETE /api/quotations/[id]` |
| **Full quotation PUT** | Done | Replaces hotels/transport/visa + recalculate |
| **Sharing in recalculate** | Fixed | Sharing stays included in hotel totals |
| **Commission on calculate** | Done | `upsertStaffCommission()` after calculate |

---

## 1. Completion Summary — What Is Done

### 1.1 Database & Backend — **Done (~92%)**

| Item | Status | Notes |
|------|--------|-------|
| PostgreSQL schema | Done | **17 tables** in `database/schema.sql` |
| Migrations | Done | **`001`–`005`** (see below) |
| Organizations + multi-tenant | Done | |
| Audit logs | Done | CREATE, UPDATE, DRAFT_SAVE, DELETE, APPROVE |
| Soft delete | Done | Quotations + `DELETE` API |
| Supabase pooler + SSL | Done | |

**Migrations:**

| File | Purpose |
|------|---------|
| `001_quotation_form_fields.sql` | Phone, WhatsApp, expiry, air tickets, upgrades |
| `002_hotel_metadata.sql` | Distance, markaziya, amenities |
| `003_hotel_distance_label.sql` | Distance label |
| `004_dual_hotel_pricing.sql` | Sharing + private booking modes |
| `005_quotation_draft_and_audit.sql` | `draft_form_json`, `updated_by`, commission unique index |

### 1.2 Authentication & Security — **Done (~85%)**

| Feature | Status |
|---------|--------|
| JWT login + refresh | Done |
| Role-based access (6 roles) | Done |
| bcrypt passwords | Done |
| Demo users | Done |
| Password reset | **Not implemented** |
| Rate limiting / MFA | **Not implemented** |

### 1.3 Quotation Form (5 Tabs) — **Done (~95%)**

Shared component: **`QuotationFormPage`** — used by **create** (`/quotations/new`) and **edit** (`/quotations/[id]/edit`).

| Tab | Status |
|-----|--------|
| Passengers | Done (validation, air tickets, expiry) |
| Hotels | Done (multi-hotel, Sharing/Private, upgrades) |
| Transport | Done (multi-route) |
| Visa | Done |
| Summary | Done |

| Capability | Status |
|------------|--------|
| Create quotation | Done |
| **Edit quotation** | **Done** — full form pre-fill, Update button |
| **Draft auto-save** | **Done** — localStorage + server every 30s |
| Transfers field | Removed (use transport routes) |

### 1.4 Calculation Engine — **Done (~96%)**

| Engine | Status |
|--------|--------|
| Private + Sharing hotels | Done |
| Transport, visa, totals, upgrades | Done |
| Staff commission (10% of total SAR) | Done on **calculate** |
| Unit tests | **19/19 passing** (calculations + mapper) |

**Note:** README “9-person” baseline **12,896 SAR** includes **1,350 SAR transfers**; current form uses **transfers = 0** → expect **~11,546 SAR** SAR subtotal for same scenario.

### 1.5 API Layer — **Done (~90%)**

**Auth:** `login`, `logout`, `refresh`, `me`  

**Hotels:** `GET/POST /api/hotels`, `GET/PUT/DELETE /api/hotels/[id]`  

**Quotations:**

- `GET/POST /api/quotations` — list with **search, status, date range, sort**
- `GET/PUT/DELETE /api/quotations/[id]` — full update + draft save + soft delete
- `POST .../addhotel`, `.../transport`, `.../visa`, `.../calculate`, `.../approve`, `GET .../summary`

**Commissions:** `GET /api/commissions`, `GET /api/admin/commissions`  

**Admin:** users, audit  

**Reference:** transport routes/options, visa categories  

**Still not implemented:**

- Password reset APIs
- Dedicated `/api/admin/dashboard` or reports API
- Server-side PDF generation (PDF is **client-side** jsPDF)

### 1.6 Frontend Pages — **Done (~90%)**

| Page | Status |
|------|--------|
| Login | Done |
| Dashboard | Done |
| Create Quotation | Done (`QuotationFormPage`) |
| **Edit Quotation** | **Done** |
| Quotations list | Done + **filters** + draft section |
| Quotation detail | Done + **Edit** + **Download PDF** + Recalculate + Approve |
| **Commissions (staff)** | **Done** |
| **Admin → Commissions** | **Done** |
| Admin → Hotels | Done (~75% of master spec) |
| Admin → Users / Audit | Basic |

### 1.7 Hotel Data (19 Hotels) — **Done (~95%)**

12 Makkah + 7 Madinah via `scripts/seed-hotels-dual-pricing.js` (Sharing + Private, markaziya).

### 1.8 Hotel Management — **Done (~75%)**

`/admin/hotels` — CRUD, dual pricing, Makkah/Madinah tabs. Gaps: category filters, Excel export, MANAGER access.

### 1.9 Testing — **Improved (~55%)**

| Type | Status |
|------|--------|
| Unit tests | **19/19 pass** (calculations + `quotation-form-mapper`) |
| Production build | **Passes** |
| Manual E2E script | `scripts/test-quotation-flow.js` |
| Automated E2E (Playwright) | **None** |
| CI GitHub Action | **Not in repo** |

---

## 2. Pending Items

### 2.1 Production ops (P0) — before peak volume

| # | Task | Effort |
|---|------|--------|
| 1 | `node scripts/migrate.js` on production (**005** required) | 15 min |
| 2 | Hotel seed + `fix-org-data.js` if needed | 30 min |
| 3 | Live smoke: create → edit → PDF → calculate → commissions | 1 hr |
| 4 | Staff briefing: no transfers line; Sharing vs Private | 30 min |
| 5 | Vercel env: `DATABASE_URL`, JWT secrets | 15 min |

### 2.2 Post-launch polish (P1)

| # | Task | Effort |
|---|------|--------|
| 1 | Sentry / error monitoring | 2 hrs |
| 2 | MANAGER access to hotel admin | 1 hr |
| 3 | Transport/visa rate admin UI | 8–12 hrs |
| 4 | GitHub Action: test + build on PR | 1 hr |
| 5 | Password reset flow | 4–6 hrs |
| 6 | Wrap create-quotation in single DB transaction | 3–4 hrs |
| 7 | Staff training PDF / video | 2–3 hrs |

### 2.3 Phase 2 (P2)

- Hotel admin: category filters, Excel export, amenities UI
- Seasonal pricing, group discounts, early bird
- E2E test suite (Playwright)
- Email notifications
- Promotional codes, advanced reporting

### 2.4 Completed since original report (no longer pending)

- [x] Edit quotation page  
- [x] PDF export (client-side)  
- [x] Draft auto-save  
- [x] Commissions dashboard (staff + manager)  
- [x] Quotation list filters  
- [x] Quotation soft-delete  
- [x] Full PUT (line items + recalculate)  

---

## 3. Improvement Suggestions (updated)

### 3.1 Technical debt (remaining)

1. **Two SAR baselines** — README/tests vs live form (transfers) — align docs or add README note.
2. **Commission currency** — Stored/displayed in **SAR**; confirm with business if PKR display needed.
3. **Create flow** — Still multi-step API calls; full transaction would reduce orphan quotes.
4. **JWT in localStorage** — Consider httpOnly cookies long-term.
5. **No rate limit on login** — Add before public exposure.

### 3.2 UX

- Mobile testing on staff phones  
- Loading skeletons on dropdowns  
- Breadcrumbs on long form  
- Commission “mark as paid” for managers (DB has `status`; UI read-only today)

### 3.3 Security

- Rotate production JWT secrets  
- Never commit `.env.local`  
- Audit log UI filters (data exists)

---

## 4. Production Readiness Checklist

### Core features

- [x] Auth works  
- [x] Create quotation end-to-end  
- [x] **Edit quotation**  
- [x] **PDF download**  
- [x] **Draft save / resume**  
- [x] **Commissions after calculate**  
- [x] **List filters**  
- [x] Calculations verified (19 tests)  
- [x] Build passes  
- [ ] Migration **005** on production DB  
- [ ] Verified on live URL (your sign-off)  

### Risks (updated)

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration 005 not run | Medium | Draft save fails silently or column error — run migrate |
| Org/hotel mismatch | Medium | `fix-org-data.js` |
| Long form + token expiry | Low | Re-login; draft should restore |
| Partial create (multi API) | Low–Medium | Use edit/recalculate; future transaction wrap |

**Browser refresh:** Mitigated by **localStorage + server draft** (was High risk — now addressed).

---

## 5. Phase 2 Roadmap (re-prioritized)

| Feature | Status | ROI |
|---------|--------|-----|
| Edit quotation | **Done** | — |
| PDF export | **Done** (client) | — |
| Draft auto-save | **Done** | — |
| Commissions UI | **Done** (read-only) | — |
| List filters | **Done** | — |
| Mark commission paid (manager) | Pending | High |
| Transport/visa admin | Pending | Medium |
| Sentry + CI | Pending | High |
| Seasonal / group pricing | Pending | Medium |
| E2E tests | Pending | Medium |

---

## 6. Completion Scorecard (updated)

| Module | May 30 report | **Now (May 31)** |
|--------|---------------|------------------|
| Database & backend | 90% | **92%** |
| Auth | 85% | **85%** |
| 5-tab form + edit + draft | 90% | **95%** |
| Calculations | 95% | **96%** |
| APIs | 80% | **90%** |
| Frontend pages | 75% | **90%** |
| Hotel data | 95% | **95%** |
| Hotel Management UI | 75% | **75%** |
| Testing | 50% | **55%** |
| Docs & training | 0% | **0%** |
| **Weighted overall** | **~78%** | **~88%** |

---

## 7. Recommended Next Steps

### Business owner

1. Sign off one **live** quotation: create → edit → PDF → approve (if used).  
2. Confirm commission % (currently **10%** of total SAR on calculate).  
3. Brief staff on **Resume draft** on quotations list.

### Developer / deploy

1. `node scripts/migrate.js` on production.  
2. Deploy latest to Vercel.  
3. Optional: GitHub Action `npm test && npm run build`.  
4. Optional: Sentry.

### Staff training

1. Tab order + mandatory fields.  
2. Sharing vs Private hotels.  
3. Transport replaces old “Transfers” line.  
4. **Download PDF** for WhatsApp customers.

---

## 8. Conclusion

**Umrah Quotation System V2 is ready for peak-season daily use** (June–August), assuming production database migration **`005`** is applied and a short live smoke test is completed.

The system now covers the full staff workflow: **create → draft → edit → recalculate → PDF → commissions view**, on top of the existing strengths: **dual hotel pricing**, **markaziya**, **multi-hotel automation**, and a **verified calculation engine**.

Primary gaps are **operational** (production migrate/seed), **documentation/training**, and **Phase 2 polish** (Sentry, paid commission workflow, transport admin, password reset)—not core quotation functionality.

---

*End of report — `V2_PROJECT_ANALYSIS_REPORT.md`*
