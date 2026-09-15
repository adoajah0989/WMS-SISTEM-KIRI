# UI regression checks

These fixtures use local sample/empty state only and do not sign in or write to Supabase.

1. `npm ci`
2. Install the optional test runner: `npm install --no-save --package-lock=false playwright`
3. `npx playwright install chromium`
4. Start `npm run dev` on port 3000.
5. In another terminal run `node tests/ux-regression.mjs`.

The test checks clearing and retyping a numeric field, single-document print isolation,
duplicate-click suppression, after-print cleanup, and the SKU form at 390px width.
It also saves a multi-page PDF to `/tmp/kiri-print-regression.pdf` for inspection.

Before release, check PO, PR, GRN, reports and QR labels in print preview on the
actual desktop/mobile browsers and printer. Multi-page documents should retain all
rows, without repeating the whole document. Printer copy-count settings are outside
the application's control. Tests here are not a full production acceptance test.
