# AiseServe (Aise360) — Scan. Order. Served. Smarter.

Monorepo: `apps/customer_app` (PWA+Capacitor) · `apps/staff_app` · `apps/kitchen_exe` (Electron) · `apps/cashier_exe` (Electron) · `apps/dashboard_web` (Next.js) · `packages/core` (BRAND single source) · `packages/ui` (Aurora theme).

## Quick start
1. Copy `.env.example` to `.env` (never commit secrets). Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` per app `.env.example`.
2. `pnpm install`
3. `supabase start` (or link cloud: `supabase link --project-ref oorjystfspyuotdzjcxq`), then `supabase db push` + seed: `psql $DATABASE_URL -f supabase/seed.sql`
4. `pnpm --filter @aiseserve/customer-app dev` (5173) · dashboard: `pnpm --filter @aiseserve/dashboard-web dev` (3000)

## Builds
- PWA: `pnpm --filter @aiseserve/customer-app build` → `dist/`
- APK (debug): `cd apps/customer_app && npx cap add android && npx cap sync && cd android && ./gradlew assembleDebug`
- EXE: `cd apps/kitchen_exe && pnpm build && npx electron-builder --win nsis`

Brand truth: `packages/core/src/brand.ts` mirrored in `supabase/functions/_shared/brand.ts`. QR: `app.aise360.com/r/{slug}?t={token}`.
