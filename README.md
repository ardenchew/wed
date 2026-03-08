# Wedding Website

A lightweight React + TypeScript wedding website with a provider-agnostic data store.  
Development data lives in TypeScript config files so backend storage can be swapped later without changing page code.

## Features

- Name + password sign-in flow
- Store abstraction (`src/services/store`) with adapter wiring
- Default `dev-config` adapter backed by TypeScript config data
- Mobile-friendly UI
- GitHub Pages deployment setup

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router (HashRouter)
- CSS

## Data Architecture

- App code calls only the store facade in `src/services/store/index.ts`
- Database key structure is defined in `src/data/schema.ts`
- Development source data is in TypeScript config files:
  - `src/config/users.ts` (display name -> guest slug)
  - `src/config/authUsers.ts` (guest slug -> password)
  - `src/config/guests.ts` and `src/config/events.ts` (domain records)

To add a real database later, implement a new adapter that satisfies `DataStore` in `src/services/store/contracts.ts`, then switch adapter selection in the store factory.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Optional `.env` adapter override:

```env
VITE_DATA_STORE_ADAPTER=dev-config
```

If omitted, `dev-config` is used by default.

3. Start development server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run deploy`
