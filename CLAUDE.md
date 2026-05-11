# Wed Project Setup

## Environment Variables

When working in a worktree, copy `.env.example` to `.env` in the worktree root:

```bash
# From within the worktree directory
cp ../.env.example .env
```

Or create a symlink to the parent `.env`:

```bash
ln -s ../../.env .env
```

This ensures Vite can load `VITE_CLOUDINARY_CLOUD_NAME` and other env vars needed for the dev server to build image URLs correctly.

## Why This Matters

- The `.env` file is gitignored (contains config values)
- Vite reads `.env` from the current working directory on startup
- Each worktree is an isolated directory, so it needs its own `.env` symlink or copy
- Without this, Cloudinary images won't load in dev mode
