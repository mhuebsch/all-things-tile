# All Things Tile

A separate Next.js/React replica of https://www.allthingstile.net/. The WordPress site, DNS, domain, and existing Facebook subscription have not been changed.

## Current preview

- Original logo, Open Sans typography, colors, page structure, responsive layout, and contact copy.
- Custom React feed: search, masonry columns, multiple photos, modal viewer, image/post navigation, and Facebook/share links. No SociableKIT script or WordPress dependency is loaded.
- Ten public posts captured November 3, 2026, stored in the separate Supabase project. Fifteen available photos are bundled locally. Photos the old feed's image service would not return are not substituted or fabricated.
- Contact submissions are saved to the private inquiries table through a validated, rate-limited Edge Function. Email delivery is disabled.
- Facebook sync code is deployed but has no credentials or schedule. Real Page access and media/engagement/history coverage have not been verified. This preview is not yet a complete replacement for the paid feed.
- Development label, noindex metadata, robots exclusion, and Vercel Authentication keep the preview distinct from the live business website.

## Accounts and projects

- Repository: https://github.com/mhuebsch/all-things-tile
- Local home: `/Users/markhuebsch/Desktop/MyRepos/all-things-tile`
- Vercel project: `all-things-tile-preview` (`prj_eIdBUWbhyZwzaF6Eb7rGsA80DdZ8`)
- Vercel team: `team_NTf2llZjrHuAFV497nyF5613`
- Supabase project: All Things Tile (`qcfdcwmlfcksdaqcwjdv`), organization Marf, US East 1. Separate from Marf's Command Center.
- Supabase dashboard: https://supabase.com/dashboard/project/qcfdcwmlfcksdaqcwjdv

## Local development

Use Node 24. Copy `.env.example` to `.env.local` and set the project's publishable URL/key. Never put a secret or service-role key in a `NEXT_PUBLIC_` variable or commit it.

```sh
npm ci
npm run dev -- --port 3100
npm run build
npm run start -- --port 3100
npm test
```

The dev command uses Webpack because Turbopack's filesystem watcher failed on this Mac. Production builds use the default Next.js builder. Tests expect a running local app on port 3100, or `BASE_URL` for another accessible instance.

## Data flow

Home page → Supabase REST API with publishable key → published posts only → React feed. If the database is unreachable, a clearly labeled local snapshot is used. A valid empty database response remains empty.

Contact form → same-origin Next.js route → Supabase `contact` Edge Function → persistent rate limiter → private inquiry. Honeypot, payload limits, validation, and per-email/source throttling are enforced. The browser never receives an admin key. RLS is enabled on every table; the inquiry, rate-limit, and sync-status tables deliberately have no public policies or grants.

Schema source: `database/schema.sql`, then `database/facebook-cache.sql`. The remote changes are recorded as Supabase migrations. `database/seed-preview.sql` contains public preview content only and must not be applied a second time without reviewing existing rows.

## Finish the Facebook connection

1. Confirm ownership/admin access to the All Things Tile Facebook Page and create/select the owner's Meta developer app.
2. Verify current Meta permissions, review requirements, supported API version, and Page token acquisition with the actual app. Do not assume these are already approved.
3. Store `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_GRAPH_VERSION`, and a random `FACEBOOK_SYNC_SECRET` only in Supabase Edge Function secrets. Do not paste credentials into chat or source control.
4. Call `facebook-sync` with the sync secret. Verify captions, all photo attachments, videos, metrics, edits/deletions, pagination, and historical coverage against Facebook. The current importer stops safely if more than 1,000 posts are returned; expand/test this before promising full history. Attachment subpagination and all video variants require live verification.
5. After validation, add a secret-authenticated refresh schedule. No schedule is installed yet. The sync commits a full new cache transactionally and keeps the previous cache if fetching fails. Confirm Meta retention requirements and handle token revocation/deauthorization before production.
6. Replace snapshot-derived profile metadata (including the displayed 15 Following count) with verified Page metadata if required. Review media expiry, cache lifetime, and stale-data indicators before launch.

## Finish contact email

Configure a verified sender with Resend (or replace the adapter with the owner's chosen mail provider). Store `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` and `CONTACT_EMAIL_ENABLED=true` in Supabase function secrets. Set `CONTACT_EMAIL_ENABLED=true` in the Vercel preview only after an authorized end-to-end delivery test. Failed deliveries remain recorded as failed in Supabase. The current preview accurately reports saved test inquiries and does not claim they were emailed.

## Before replacing WordPress

Review desktop/mobile screenshots, obtain the complete original photo set, prove Facebook parity and email delivery, preserve URLs/metadata and validate redirects, add appropriate abuse protection and inquiry retention, make a rollback plan, then obtain explicit approval for a domain cutover. Remove preview labels and indexing restrictions only during that approved release.
