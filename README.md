# hellocrawler.world

The launch outpost for `hellocrawler.world`: an unofficial, noncommercial, fan-powered community concept for *Dungeon Crawler Carl* readers.

The MVP includes the scrambled opening clock, free sticker claim, anonymous feature vote, results, and a hidden future-volunteer interest level. It does not include accounts, feeds, comments, fan uploads, analytics, advertising, commerce, or automated email delivery.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase credentials, the visual experience and browser validation work locally, but real submissions return a safe service-unavailable message.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Production | Server-only Supabase project URL |
| `SUPABASE_SECRET_KEY` | Production | Server-only `sb_secret_...` key; never expose as `NEXT_PUBLIC_` |
| `SUBMISSION_HASH_SECRET` | Production | At least 32 random characters used to HMAC normalized email addresses |
| `WAITLIST_ALLOWED_ORIGINS` | Recommended | Comma-separated extra trusted origins; canonical and forwarded request origins are already accepted |

The countdown is intentionally scrambled every five seconds and is not a launch date.

## Database

The migrations create separate sticker-claim, anonymous-vote, and volunteer-interest tables. Every table has RLS enabled and forced. Browser roles receive no table privileges and cannot execute submission functions; only the server-side `service_role` can use the validated database functions.

```bash
npx supabase start
npx supabase db reset
```

## Verification

```bash
npm run verify
```

`check:repo` fails if private planning folders, local environment files, design-source files,
private-key material, or high-confidence production secrets enter the commit set. CI repeats the
repository check, lint, typecheck, tests, and production build on every push and pull request.

## Security boundary

- Browser roles have no access to captured emails or votes; only the server-side Supabase secret can call the constrained database functions.
- Submission endpoints accept same-origin JSON only, cap bodies at 4 KiB, validate every field,
  use honeypots, throttle bursts in memory, and return non-cacheable generic errors.
- Claims without launch-notice consent store only a keyed email hash, not the raw email. Volunteer
  interests expire after 12 months; opening-notice retention must be set to launch date plus 90 days.
- Production responses include a restrictive Content Security Policy and clickjacking, MIME,
  permissions, referrer, cross-origin, and HTTPS hardening headers.
- The in-memory throttle is defense in depth, not distributed abuse protection. Production hosting
  should also apply provider-level rate limiting or a challenge to `/api/*` as traffic grows.

## Project status

Hello Crawler is an original, community-built fan project. It is not affiliated with or endorsed by Matt Dinniman, his publishers, Audible, or other rights holders. The repository contains no official artwork, book text, or audio.
