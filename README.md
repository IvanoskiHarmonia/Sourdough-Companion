# Sourdough Companion

An installable, offline-first sourdough companion built with React, TypeScript, Vite, and `vite-plugin-pwa`. No account, server, database, paid API, or runtime CDN is required.

## Run on your Mac

Install Node.js **22.12 or newer** (Node 24 LTS recommended) from [nodejs.org](https://nodejs.org/). If you use Homebrew:

```sh
brew install node@24
export PATH="$(brew --prefix node@24)/bin:$PATH"
```

From this repository:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The service worker is deliberately disabled in development. Use the production preview to test caching:

```sh
npm run build
npm run preview
```

Open `http://localhost:4173`. The production build is in `dist/`. `vite preview` is a local verification server, not a public production host. Service workers require HTTPS, except on localhost. Opening a Mac’s plain HTTP LAN address on an iPhone will not test PWA installation/offline support correctly.

## What’s included

- Live scaling from 250 g active starter, 725 g water, 1,000 g bread flour, and 25 g salt. Fractional input is accepted, including a decimal comma; zero, negatives, nonnumeric text, and amounts above 100,000 g are rejected.
- Full-precision JavaScript number calculations, with no intermediate rounding. Display quantities use up to three decimal places; `≈` marks a rounded display. A tiny positive quantity can consequently display `≈ 0 g` and is impractical for a kitchen scale.
- Separate 1:1:1 feeding calculations, based on either existing starter or desired fed starter. Fed starter still needs time to become active.
- A two-day recipe with scaled quantities in every ingredient instruction. The four fold rounds are expanded into separate screens, for 17 steps from feeding through cooling in each independent bake. The recipe follows the supplied written brief; no original video was supplied for independent comparison.
- Independent baking sessions: start a 50 g starter bake, then tap **Add bake** to start another with 100 g (or any valid amount). Each named bake has its own complete recipe, current step, checkmarks, recipe lock, and timers. Switch with **Your bakes**; the calculator and full recipe follow the selected session. All sessions save locally and recover offline. Reset removes only the selected bake and its timers; the others keep running.
- Saved cooking position, completion checkmarks, and recipe lock. New bakes lock automatically. Unlocking allows calculator edits to update the current bake. “Next step” navigates; the checkbox records completion independently.
- Adjustable activation, rest, fold, bulk, proof, baking, and cooling timers; pause, resume, restart, and removal. Running timers store absolute deadlines. Three 30-minute intervals separate four fold rounds. The default overnight timer is 10 hours within the 8–12-hour range.
- Loaf guidance near the original 1,000 g dough size. For example, 150 g starter makes one 1,200 g loaf; 500 g starter makes four 1,000 g loaves. Baking times require adjustment for loaf size and oven behavior. For several loaves within one recipe, repeat the baking steps and timers for additional oven batches as needed.
- Light/dark themes, keyboard navigation, focus indicators, labeled controls, safe-area padding, mobile bottom navigation, and native confirmation dialogs.
- Custom 192 px / 512 px icons, maskable icon, 180 px Apple touch icon, standalone manifest, and locally cached app assets.
- Explicit update prompt. New code only activates when the user chooses “Update now”; progress is saved before reloading.

## Tests

```sh
# Unit + React component tests
npm test

# Interactive unit-test watch mode
npm run test:watch

# One-time browser installation for end-to-end tests
npx playwright install chromium webkit

# Build and test the production app in desktop Chromium,
# mobile Chromium, and mobile WebKit
npm run test:e2e

# Run unit/component tests, build, and all browser tests
npm run check
```

On Linux CI, use `npx playwright install --with-deps chromium webkit` to install required browser system libraries. The Playwright config starts the production preview automatically on port 4173. Stop another server on that port first if it serves a different project.

The suite contains 42 unit/component tests and 21 browser tests across the three browser profiles. Accessibility checks scan all five screens in both themes with axe (WCAG A/AA rules); automated checks do not replace manual assistive-technology testing.

Tests cover all four required scaling cases, fractional precision, invalid inputs, both feed modes, updated recipe text, storage recovery and failures, cooking persistence and locking, reset confirmation, mobile navigation, timer reload/pause/resume/expiry, theme persistence, independent 50 g / 100 g recipes and progress, concurrent per-session timers, removal of one session without affecting another, legacy-session migration, and real service-worker offline reloads. Failure artifacts are in `test-results/`; open a trace with `npx playwright show-trace path/to/trace.zip`.

Automated WebKit testing is useful but does **not** verify an actual iPhone’s Home Screen installation, OS storage policies, safe-area hardware, or background suspension. Perform the physical-device checklist below before sharing.

## Deploy for free

The app is a static site. Use the free tier of either provider, subject to its current usage limits. Deploy the repository including `package-lock.json` and the committed `public/` icons. Keep the app at the root of its domain: the manifest, icons, and service-worker scope use `/`.

### Option A: Vercel

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Sign in at [Vercel](https://vercel.com/) and choose **Add New → Project**.
3. Import the repository. Select **Vite** if it is not detected automatically.
4. Use build command `npm run build`, output directory `dist`, and install command `npm ci`. Select Node 24 in project settings.
5. Deploy. Open the public HTTPS production URL shown on the deployment, such as `https://your-project.vercel.app`.
6. Prefer that stable production URL when installing the app. Each preview deployment or different hostname has its own storage.

No API keys or environment variables are needed. `vercel.json` prevents stale HTML and service-worker caching while letting Vite’s hashed assets cache efficiently.

### Option B: Cloudflare Pages

1. Push the repository to GitHub or GitLab.
2. In the Cloudflare dashboard, open **Workers & Pages → Create application → Pages → Connect to Git** (labels may vary).
3. Select the repository and production branch.
4. Choose the **Vite** preset, build command `npm run build`, and output directory `dist`.
5. Set `NODE_VERSION` to `24` in the build environment if needed. No runtime environment variables are required.
6. Deploy, then copy the public HTTPS URL, such as `https://your-project.pages.dev`.

Alternatively, upload an existing local production build with the Cloudflare CLI:

```sh
npm run build
npx wrangler login
npx wrangler pages project create sourdough-companion
npx wrangler pages deploy dist --project-name sourdough-companion
```

Wrangler prints the HTTPS deployment URL. Install from the stable production alias, rather than a changing preview URL. `public/_headers` is copied to `dist` for Cloudflare Pages cache headers.

See [Vite’s deployment guide](https://vite.dev/guide/static-deploy.html) for provider setup details.

## Install on an iPhone

1. Open the public **HTTPS** production URL in **Safari**.
2. Let the app finish loading. “Ready for offline” appears in the footer once caching is ready (also in the desktop header). You can also verify the worker on a Mac as described below.
3. Tap Safari’s **Share** button.
4. Scroll through the actions and choose **Add to Home Screen**. If hidden, look in **Edit Actions**. On newer iOS versions, leave **Open as Web App** enabled if that switch is shown.
5. Keep the name “Sourdough” and tap **Add**.
6. Launch the app using its new **Home Screen icon**, once while online. This is the app you should use for your bake.
7. Enter the active starter amount and tap **Let’s bake**. Your progress saves automatically.

Safari and the installed app can have separate storage. Set up your baking session in the installed app itself; do not rely on Safari’s previous session transferring. Data stays on that device and origin. Clearing website data, uninstalling the app, using private browsing, changing the URL, or browser storage eviction can remove it. Nothing is synced or backed up remotely. Storage failures display an in-app warning.

### Verify offline on the device

1. Launch the installed app while online and wait for it to finish loading.
2. Set the recipe to **125 g** starter. Confirm **362.5 g** water, **500 g** flour, and **12.5 g** salt.
3. Start a bake, check off the first step, and move to the next step. Start a timer from the Timers tab.
4. Close the app. Enable Airplane Mode and ensure Wi-Fi is also off.
5. Reopen from its Home Screen icon. Check that the calculator, full recipe, feeding, and cooking screens still load.
6. Confirm your saved recipe, completed step, and cooking position remain. The timer should have advanced by the elapsed wall-clock time.
7. Restore the connection afterward.

For desktop debugging, use Chromium DevTools **Application → Service Workers** and **Cache Storage**, then enable **Network → Offline** and reload. The automated offline test exercises this same production service worker without mocking fetches.

## Timers and notifications

A timer’s deadline survives app suspension and closing; it is recalculated on reopening or returning to the app. It is not dependent on a JavaScript interval staying alive. Changing the system clock can change the displayed remaining time.

**This static app cannot reliably send background alarms on iOS.** Use an iPhone Clock alarm when you need a guaranteed alert while the phone is locked or the app is closed. Optional notification permission is offered only on supported non-iOS browsers and only after an explicit button press. Notifications are best-effort when the running app detects expiry. There is no push subscription or background scheduling server. The app never claims permission alone enables background alarms. See [WebKit’s explanation of Home Screen web push](https://webkit.org/blog/13878/).

## Updating the app

1. Edit the source and run `npm run check`.
2. Commit and push to your production branch. Vercel / Cloudflare builds and deploys it automatically. For CLI deployment, repeat the build and deploy commands.
3. Open the installed app online. The service worker checks for new assets when registering on launch.
4. When the update banner appears, tap **Update now** at a convenient point. You can dismiss it and finish the bake first.
5. The current bake and timer deadlines remain in localStorage. Updating the service worker does not reset them. Older single-session saves migrate automatically into “Bake 1,” keeping ingredient amounts, completion, position, and timer deadlines. Saves from the previous multi-loaf view become one bake with the original loaf records available under **Progress saved from the previous loaf view**. The main checklist marks individual steps complete only when all old loaves had completed them; the original checkmarks remain readable and every old timer remains available. New bakes always start independently at step 1.

## Project map

- `src/recipe.ts`: shared calculations, formatting, loaf guidance, and all recipe instructions.
- `src/baking.ts`: independent session creation, navigation, completion, and session-specific timer identities.
- `src/storage.ts`: versioned persistence, data validation, and timestamp timer functions.
- `src/App.tsx`: five screens, navigation, reusable controls, session lifecycle, and update handling.
- `src/Icons.tsx`: original SVG icons and bread illustration; no external image dependencies.
- `src/styles.css`: responsive design, dark theme, safe-area handling, and accessibility styles.
- `public/`: committed app icons and Cloudflare headers. `node scripts/icons.mjs` regenerates PNGs from the SVG with Sharp.
- `src/*.test.*`: unit and component tests; `tests/`: production browser tests.
- `vite.config.ts`: manifest and service-worker configuration.

No analytics, cookies, account system, or third-party content requests are used at runtime.
