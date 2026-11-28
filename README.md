# Emily & Arden

Wedding website for Emily & Arden. React 19 + TypeScript, built with Vite, images served from
Cloudinary, hosted on GitHub Pages at https://ardenchew.github.io/wed/.

Guests, passwords and RSVPs live in a Cloudflare D1 database (`wed`) behind a small Cloudflare
Worker (`wed-api`, at https://wed-api.ardenchew.workers.dev). Emily and Arden manage guests from
the site's **Admin** page. Events are still defined in `src/config/events.ts`.

## Run locally

```bash
cp .env.example .env
npm install
npm run api:dev   # API + local database on http://localhost:8787 (no Cloudflare login needed)
npm run dev       # the site, in a second terminal
```

Then open http://localhost:5173/wed/. Sign-in needs the API running: the guest list and passwords
come from it. The local database is seeded with the original guests by `migrations/0003_guests.sql`.

## Deploy

**Site** (after merging to `main`; merging alone does not deploy):

```bash
npm run deploy
```

This builds the site and pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves.

**API** (when `worker/`, `migrations/` or `src/config/events.ts` changed — guest edits made in the
admin page need no deploy):

```bash
npx wrangler login     # once per machine
npm run api:migrate    # apply new files in migrations/ to the real database
npm run api:deploy
```

## Scripts

| Script                | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Site dev server with hot reload                              |
| `npm run api:dev`     | API with a local D1 database (applies migrations first)      |
| `npm run build`       | Type-check the site and Worker, build the site into `dist/`  |
| `npm run preview`     | Serve the built `dist/` locally                              |
| `npm run lint`        | ESLint, zero warnings allowed                                |
| `npm run deploy`      | Build and publish the site to GitHub Pages                   |
| `npm run api:migrate` | Apply D1 migrations to the real (remote) database            |
| `npm run api:deploy`  | Publish the API Worker                                       |

## Where things live

- `src/pages/` — Landing (sign-in), Home, Schedule, Admin, and a `/splash` preview page
- `src/config/` — events and nav items
- `src/api/` — the API client (`client.ts`) and guest / admin calls (`guests.ts`)
- `src/guests/shared.ts`, `src/rsvp/shared.ts` — types and validation shared by the site and the
  Worker, so both always agree
- `src/components/RsvpModal.tsx`, `RsvpStatusButton.tsx` — the RSVP modal and the status
  indicator on Home and Schedule; `src/context/RsvpProvider.tsx` loads RSVPs once and opens the
  modal from anywhere
- `src/components/AdminGuestDialog.tsx` — the admin add / edit form
- `worker/` — the API: `index.ts` (routes), `guests.ts` (guests + sign-in), `rsvp.ts`, `admin.ts`
- `migrations/` — D1 schema, applied in order by Wrangler
- `src/utils/cloudinary.ts` — builds Cloudinary image URLs from public ids like `wed/home/...`
- `src/styles/index.css` — all styles

## Guests and admin

- Every guest has a password; sign-in sends it to the API (HTTP Basic auth), which checks it
  against the `guests` table. The site keeps it in the browser's saved session for later calls.
- Guests marked `is_admin` (Emily and Arden) get an **Admin** item in the menu. The admin page
  lists every guest with their party and RSVP (answers, mobile, dietary restrictions), and lets you
  add, edit or remove guests — name, nickname, password, party, invitations, welcome message and
  polaroids. Removing a guest also deletes their RSVP. Admins can't be removed from the page; to
  make someone an admin, set `is_admin = 1` on their row in the D1 console.
- A **party** is everyone sharing a `party_id`; any member can RSVP for the others. In the admin
  form, tick everyone who belongs in a guest's party: the party becomes exactly that guest plus
  the people ticked. Ticking someone from another party moves them over (the form says so), and
  anyone left on their own is simply solo again.

## RSVPs

- Each guest answers per event they're invited to. The modal defaults to one answer for all
  events, with an "Event by event" option.
- A phone number is required for every guest attending at least one event; dietary restrictions
  are optional (up to 200 characters).
- The API only lets a guest read or write their own party.

## Environment variables

| Variable                     | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud for image URLs (public)             |
| `VITE_RSVP_API_URL`          | API Worker URL (`.env` for dev, `.env.production`)   |

`VITE_*` values are inlined into the public bundle, so they must never hold secrets.

## Security notes

- Passwords are stored in plain text so admins can read them back to guests. Anyone with access to
  the Cloudflare account can see them.
- The seed passwords in `migrations/0003_guests.sql` were already public (they used to ship in the
  JS bundle) — change them from the admin page before sharing the site.
- There's no rate limit on sign-in attempts, so short passwords could be guessed. Use passwords
  that aren't trivially guessable.
