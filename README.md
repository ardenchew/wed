# Emily & Arden

Wedding website for Emily & Arden. React 19 + TypeScript, built with Vite, images served from
Cloudinary, hosted on GitHub Pages at https://ardenchew.github.io/wed/.

RSVPs are stored in a Cloudflare D1 database (`wed`) behind a small Cloudflare Worker
(`wed-api`, at https://wed-api.ardenchew.workers.dev). Everything else is static.

## Run locally

```bash
cp .env.example .env
npm install
npm run api:dev   # RSVP API + local database on http://localhost:8787 (no Cloudflare login needed)
npm run dev       # the site, in a second terminal
```

Then open http://localhost:5173/wed/. The site works without `api:dev`, but the RSVP button will
say it can't reach the RSVP service.

## Deploy

**Site** (after merging to `main`; merging alone does not deploy):

```bash
npm run deploy
```

This builds the site and pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves.

**RSVP API** (only when `worker/`, `migrations/` or the guest/event/password config changed —
the Worker bundles `src/config/*`, so a new guest or event needs an API deploy too):

```bash
npx wrangler login     # once per machine
npm run api:migrate    # apply new files in migrations/ to the real database
npm run api:deploy
```

## Scripts

| Script                | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Site dev server with hot reload                              |
| `npm run api:dev`     | RSVP API with a local D1 database (applies migrations first) |
| `npm run build`       | Type-check the site and Worker, build the site into `dist/`  |
| `npm run preview`     | Serve the built `dist/` locally                              |
| `npm run lint`        | ESLint, zero warnings allowed                                |
| `npm run deploy`      | Build and publish the site to GitHub Pages                   |
| `npm run api:migrate` | Apply D1 migrations to the real (remote) database            |
| `npm run api:deploy`  | Publish the RSVP Worker                                      |

## Where things live

- `src/pages/` — Landing (sign-in), Home, Schedule, and a `/splash` preview page
- `src/config/` — guest list (including `party`), events, passwords, and nav items
- `src/components/RsvpModal.tsx`, `RsvpStatusButton.tsx` — the RSVP modal and the status
  indicator shown on Home and Schedule; `src/context/RsvpProvider.tsx` loads RSVPs once and opens
  the modal from anywhere (the indicators and the menu's RSVP item)
- `src/rsvp/` — RSVP types and rules shared by the site and the Worker, plus the API client
- `worker/index.ts` — the RSVP API (`GET` / `PUT /rsvp`)
- `migrations/` — D1 schema, applied in order by Wrangler
- `src/utils/cloudinary.ts` — builds Cloudinary image URLs from public ids like `wed/home/...`
- `src/styles/index.css` — all styles

## RSVPs

- A guest's **party** is themselves plus everyone listed in their `party` in
  `src/config/guests.ts` (in either direction). Any party member can RSVP for any other.
- Each guest answers per event they're invited to (`events` in `guests.ts`). The modal defaults to
  one answer for all events, with an "Event by event" option.
- A phone number is required for every guest attending at least one event.
- Attending guests can also add dietary restrictions (optional, up to 200 characters).
- The API checks the same passwords as the site (HTTP Basic auth) and only lets a guest read or
  write their own party.

To see responses, open the `wed` database in the Cloudflare dashboard (**Storage & databases →
D1 → wed → Explore Data**), or run:

```bash
npx wrangler d1 execute wed --remote --command "SELECT * FROM event_rsvps"
```

## Environment variables

| Variable                     | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud for image URLs (public)             |
| `VITE_RSVP_API_URL`          | RSVP Worker URL (`.env` for dev, `.env.production`)  |
| `VITE_DATA_STORE_ADAPTER`    | Optional; defaults to `dev-config`                   |

`VITE_*` values are inlined into the public bundle, so they must never hold secrets.

## Known limitation

Sign-in is checked in the browser: passwords and every guest's data ship in the JS bundle, so the
login keeps casual visitors out but is not real security. RSVPs are exactly as private as those
passwords: anyone who reads the bundle could sign in as a guest and see or change that guest's
party's RSVPs.
