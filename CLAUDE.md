# Wed Project Notes

## Working in a worktree

Run every command from the worktree directory, not the repo root. The dev server serves the files of
the folder it starts in, and a worktree without its own `node_modules` silently falls back to the
root's packages.

```bash
cp .env.example .env   # .env.example is tracked, so every worktree already has it
npm install
npm run dev            # http://localhost:5173/wed/
```

Without `.env`, `VITE_CLOUDINARY_CLOUD_NAME` is unset in dev and Cloudinary images won't load
(`cloudinaryUrl` returns the bare public id). Production builds read it from the tracked
`.env.production`.

## Secrets

Everything prefixed `VITE_` is inlined into the public JS bundle. Never put a secret in a `VITE_`
variable, and never copy a real `.env` into `.env.example` — that file is committed to a public repo.
