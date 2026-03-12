# Mason Admin (Desktop)

Mason Admin runs as a **desktop-only** application via Electron.

## Run in development

Starts the Vite dev server and opens the app in an Electron window (with hot reload):

```bash
npm run electron:dev
```

## Run production build

Build the web app and run it in Electron (no dev server):

```bash
npm run build
npm run electron:start
```

## Package installers

Build installers for Windows (NSIS), macOS (DMG), or Linux (AppImage):

```bash
npm run electron:build
```

Output is in the `release/` folder.

## Environment

Create a `public/env.js` file (or use `.env` with `VITE_*` variables) for Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

For desktop, `public/env.js` is loaded at runtime so you can point to your Supabase project without bundling secrets.
