# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a monorepo with 3 web apps (plus a legacy static site, an Expo mobile scaffold, and a Swift iOS app). All share a single hosted **Supabase** backend (no self-hosted backend). There is no root `package.json`; each sub-project is independent.

| App | Path | Dev Port | Dev Command |
|-----|------|----------|-------------|
| mason-web | `mason-web/` | 5173 | `npm run dev` |
| Masoncord | `masoncord/` | 5175 | `npm run dev` |
| Mason Admin | `masonadmin/` | 5174 | `npm run dev` (web) or `npm run electron:dev` (Electron) |

### Environment variables

All 3 apps need the same Supabase credentials. mason-web and masoncord use `.env` files with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. masonadmin uses `public/env.js` (runtime-injected). The credentials are already checked into `masoncord/.env` and hardcoded in the legacy HTML files (e.g. `pricing.html`).

If `mason-web/.env` or `masonadmin/public/env.js` values are empty/placeholder, copy the credentials from `masoncord/.env`.

### Lint / Build / Test

- **Lint**: `npm run lint` in `mason-web/` and `masoncord/`. masonadmin does not have a lint script.
- **Build**: `npm run build` in each app directory.
- **No automated test suites** exist in this repo.

### Gotchas

- masonadmin uses an older Vite (v5) and React 18; mason-web and masoncord use Vite v8 and React 19. Don't cross-install dependencies.
- Electron features (`electron:dev`, `electron:build`) require a display server and won't work headlessly. Use `npm run dev` for web-only masonadmin development.
- mason-web has a pre-existing lint error in `src/lib/parseWhatsNewHtml.ts` (`prefer-const`). This is not introduced by cloud agent changes.
- The masonmobile (Expo) and masonios (Swift/Xcode) apps are not runnable in this Linux cloud environment.
