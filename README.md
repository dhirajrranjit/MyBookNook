# My Book Nook

A private, offline-first children's PDF bookshelf and reader. Books never leave the device and are stored in IndexedDB.

## Milestone 0 capabilities

- Responsive Bookshelf, Reader, and Parent Tools screens.
- Single or multi-PDF import with magic-byte validation and SHA-256 duplicate detection.
- Page count, PDF metadata, and page-one cover generation through a locally bundled PDF.js module worker.
- Friendly rejection of password-protected, unsupported-encryption, damaged, empty, and non-PDF files.
- On-device Dexie database with a documented version-one schema.
- Basic reader with resume position, fit-page, fit-width, zoom controls, swipe navigation, and keyboard arrows.
- Installable app shell with offline precaching; imported PDFs are never added to service-worker caches.
- iPad installation instructions, Android install prompt support, storage usage, and persistent-storage request.
- GitHub Pages deployment workflow for the `/my-book-nook/` repository path.

## Milestone 1 additions

- A parent confirmation step before each PDF is saved, with editable title and author fields.
- Direct page-number jumping for longer books, with safe limits from page 1 through the final page.
- An expandable Contents panel that reads a PDF's embedded outline and jumps directly to a selected section.
- Verified with a 130-page, 53.4 MB illustrated PDF from import through page rendering.

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

Serve the production `dist` directory over HTTPS when testing installation and service-worker behavior.

## GitHub Pages deployment

1. Create a public repository named `my-book-nook`.
2. Push this project to the repository's `main` branch.
3. In **Settings → Pages**, select **GitHub Actions** as the source.
4. The included workflow tests, builds, and deploys the app.
5. Open `https://YOUR-USERNAME.github.io/my-book-nook/`.

If the repository name changes, update `basePath` in `vite.config.ts`; the same value drives Vite, the manifest start URL, scope, and service-worker fallback.

## Install on iPad

1. Open the deployed HTTPS URL in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Tap **Add**.
5. Open the installed app online once, then close and test again with the device offline.

## Install on Android

Open the deployed URL in Chrome and use **Install app** in the browser menu or the available button in Parent Tools.

## Data and privacy

- PDFs, covers, metadata, and progress stay in IndexedDB on the current device.
- The service worker caches only the compiled application shell and bundled assets.
- No PDF, secret, or personal content belongs in this repository. `.gitignore` excludes PDF files and test-book folders.
- Password-protected PDFs are intentionally rejected in the MVP. Unlock a copy before importing it.

## Migration strategy

Each persistent schema change receives a new Dexie version and a named, transaction-safe upgrade function. Migrations should be additive when possible, use defaults for newly required values, retain PDF blobs, and be tested against a fixture representing the preceding schema. Backup format versions evolve separately from IndexedDB schema versions.

## Physical-device gate

Milestone 0 is complete only after a real iPad confirms: deployed page loads, Home Screen installation succeeds, a local PDF imports through the bundled worker, page 1 renders, and the installed app reopens offline. Repeat the core path in Android Chrome.
