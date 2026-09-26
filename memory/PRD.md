# Montez Infobyte Mobile App - PRD

## Overview
Android mobile app that mirrors the customer-facing experience of www.montezinfobyte.com. It's a B2B manufacturing & procurement platform for Indian businesses.

## Data Sources
- **Upstream site backend** (read-only, `https://enterprise-supply-1.emergent.host`):
  - `GET /api/products` — product catalog
  - `GET /api/categories` — categories
  - `GET /api/settings` — brand settings (logo, colors, contact info, socials)
  - `GET /api/pages/home` — homepage CMS content
  - `POST /api/rfq` — submit RFQ
- **Local supplementary backend** (`/app/backend/server.py`, at `${EXPO_PUBLIC_BACKEND_URL}`):
  - `GET/PUT /api/mobile/cms` — splash image/duration, app logo, welcome heading/subtext/image, home banner image/text, announcement (admin-updatable)
  - `POST /api/mobile/otp/send` — dev OTP (returns 123456)
  - `POST /api/mobile/otp/verify` — verify OTP, returns session token + user
  - `POST /api/register-push` — Expo push registration (via Emergent managed push)
  - `POST /api/notifications/broadcast` — admin broadcast title+message to all registered users

## Screens
1. **Splash** — logo + tagline over CMS splash image, 1.6s auto-advance
2. **Welcome** — heading/subtext/image (CMS), "Explore Products" CTA, skippable, remembered
3. **Home (tab)** — logo header, hero banner (CMS), announcement banner (CMS), stats block, featured products (2-col), pull-to-refresh
4. **Products (tab)** — search + category chips (horizontal scroll) + 2-col grid
5. **Product Detail** — image gallery pager, name, category, MOQ, price, lead-time, material, description, sticky Request Quote CTA
6. **RFQ (tab)** — full form (name, email, phone, category, quantity, description) with validation, submits to upstream `/api/rfq`
7. **Contact (tab)** — call, WhatsApp, email, address, social links (from `/api/settings`)
8. **Account (tab)** — logged-out: phone → OTP; logged-in: profile + row navigation + logout

## Design
- Brand color `#940A0A` (maroon) with white base
- Plus Jakarta Sans typography (system fallback in Expo Go preview)
- iOS-native clean aesthetic

## Push Notifications
- Auto-registers device token on app launch (anonymous `guest` id) and again after OTP login
- Uses Emergent managed push (SuprSend) via `EMERGENT_PUSH_KEY` (auto-set at deploy)
- Requires `google-services.json` for Android delivery — user drops in before build
- Not delivered in Expo Go preview (works only in production builds)

## Non-goals
- No native admin dashboard in the app; admin controls the CMS via the website (or by PUT-ing to `/api/mobile/cms` with `X-Admin-Token`)

## 2026-08-15 — Deployment Build Fix
- EAS/APK build was failing at `yarn install --frozen-lockfile` because `react-native-play-install-referrer@2.0.1` was in package.json but missing from yarn.lock. Regenerated yarn.lock via `yarn install` — frozen-lockfile now passes.
- Renamed `assets/images/fevicon.png` → `favicon.png` to match app.json web.favicon path.
- Added `/health` endpoint (200 {"status":"ok"}) to backend/server.py for K8s health probes.
- Fixed duplicate `categoryGrid` StyleSheet key in app/(tabs)/home.tsx (lint error).
- Verified: expo_release_build_ok=true, dependency_manifests_valid=true, expo_backend_reachable=true, compilation_passed=true.
- Remaining deployment-agent flags are security-hardening policy items (upstream URL by design, admin token fallback, .gitignore) — not build blockers; previous production deployment succeeded with them.
