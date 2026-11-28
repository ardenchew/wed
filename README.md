# Emily & Arden

Wedding website for Emily & Arden. React 19 + TypeScript, built with Vite, images served from
Cloudinary, hosted on GitHub Pages at https://ardenchew.github.io/wed/.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Then open http://localhost:5173/wed/.

## Deploy

```bash
npm run deploy
```

This builds the site and pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves.
Merging to `main` does **not** deploy — run this after merging.

## Scripts

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                    |
| `npm run build`   | Type-check and build into `dist/`             |
| `npm run preview` | Serve the built `dist/` locally               |
| `npm run lint`    | ESLint, zero warnings allowed                 |
| `npm run deploy`  | Build and publish to GitHub Pages             |

## Where things live

- `src/pages/` — Landing (sign-in), Home, Schedule, and a `/splash` preview page
- `src/config/` — guest list, events, passwords, and nav items
- `src/services/store/` — the data-store facade the pages call for sign-in
- `src/utils/cloudinary.ts` — builds Cloudinary image URLs from public ids like `wed/home/...`
- `src/styles/index.css` — all styles

## Environment variables

| Variable                     | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud for image URLs (public)       |
| `VITE_DATA_STORE_ADAPTER`    | Optional; defaults to `dev-config`             |

`VITE_*` values are inlined into the public bundle, so they must never hold secrets.

## Known limitation

Sign-in is checked in the browser: passwords and every guest's data ship in the JS bundle, so the
login keeps casual visitors out but is not real security.
