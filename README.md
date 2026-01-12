# Wedding Website

A lightweight React + TypeScript wedding website that uses Redis Cloud as its database, accessible via browser on both mobile and desktop devices. Hosted on GitHub Pages.

## Features

- **Simple Authentication**: Name-based sign-in (no passwords required)
- **Redis Integration**: Direct client-side interaction with Redis Cloud via REST API
- **Responsive Design**: Mobile-first design that works on all devices
- **Clean Architecture**: Versioned schema system for data structure management
- **GitHub Pages Ready**: Configured for easy deployment to GitHub Pages

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **React Router** (HashRouter) for navigation
- **Redis Cloud** for data storage
- **CSS** for styling (no CSS-in-JS)

## Project Structure

```
wed/
├── schema/              # Versioned Redis schema definitions
│   └── v1/             # Schema version 1
├── src/
│   ├── context/        # React Context providers
│   ├── pages/          # Page components
│   ├── services/       # External service integrations
│   ├── styles/         # Global CSS styles
│   └── types/          # TypeScript type definitions
├── public/             # Static assets
└── dist/               # Build output (generated)
```

## Prerequisites

- Node.js 18+ and npm
- Redis Cloud account with REST API enabled
- Git (for deployment)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/ardenchew/wed.git
cd wed
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Upstash Redis credentials:

```env
VITE_UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token-here
```

**Important**: Replace these values with your actual Upstash Redis REST URL and token.

### 5. Upstash Redis Setup

To use Upstash Redis with this application:

1. Create an Upstash account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the **REST URL** and **REST Token** from your database dashboard
4. Add these to your `.env` file

**Note**: Upstash Redis provides a REST API that works directly from browsers, making it perfect for client-side applications. The REST API supports all standard Redis commands via HTTP requests.

### 6. Populate User Data

Before users can sign in, you need to populate the Upstash Redis database with user passwords. Each user's password should be stored with:

- **Key**: `user:{redis_key}:password` (where `redis_key` comes from `src/config/users.ts`)
- **Value**: The user's password (plain text for now, as this is a small private wedding)

Example for the seeded users:
- Key: `user:emily_kwan:password`
- Value: `your-password-here`
- Key: `user:arden_chew:password`
- Value: `your-password-here`

You can populate passwords using:
- The Upstash Redis console web interface
- The Upstash CLI
- A simple script using the `@upstash/redis` package

### 6. Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 7. Build for Production

```bash
npm run build
```

The production build will be generated in the `dist/` directory.

## Deployment to GitHub Pages

### Initial Setup

1. Ensure your repository is initialized and connected to GitHub
2. The `homepage` field in `package.json` is already set to `https://ardenchew.github.io/wed`
3. The `base` path in `vite.config.ts` is already configured as `/wed/`

### Deploy

Deploy to GitHub Pages:

```bash
npm run deploy
```

This will:
1. Build the production version
2. Deploy the `dist/` folder to the `gh-pages` branch
3. Make your site available at `https://ardenchew.github.io/wed`

### GitHub Pages Configuration

After deployment:

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Pages**
3. Ensure the source is set to the `gh-pages` branch
4. Your site should be live at `https://ardenchew.github.io/wed`

### Environment Variables for GitHub Pages

For GitHub Pages deployment, you have a few options:

**Option 1: Build-time Variables (Recommended)**
- Set environment variables during local build before deploying
- Build locally with your `.env` file, then deploy the built `dist/` folder

**Option 2: GitHub Actions**
- Create a GitHub Actions workflow that builds with environment secrets
- Store `VITE_REDIS_ENDPOINT` and `VITE_REDIS_AUTH_TOKEN` as repository secrets

**Option 3: Public Configuration**
- If using public endpoints, you can hardcode them (not recommended for production)

## Schema Versioning

The application uses a versioned schema system located in the `schema/` directory. This allows for:

- **Future migrations**: Easy schema evolution without breaking existing data
- **Type safety**: Schema definitions inform TypeScript types
- **Documentation**: Clear structure of data models

Current schema version: **v1**

### User Schema (v1)

- **Key Format**: `user:{normalized-full-name}`
- **Value Format**: Full name (string)
- **Normalization**: Lowercase, trimmed whitespace

Example:
```typescript
Key: "user:john doe"
Value: "John Doe"
```

## Usage

1. **Landing Page**: Users enter their full name
2. **Authentication**: System checks if name exists in Redis
3. **Home Page**: After successful authentication, users see:
   - Welcome message with their name
   - RSVP button
   - Schedule button
   - Gift button

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and deploy to GitHub Pages

## Contributing

This is a private wedding website. For any changes or issues, please contact the repository owner.

## License

Private project - All rights reserved.
