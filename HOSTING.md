# Hosting TAPE//CLUB and counting viewers

The site is fully static: everything it needs is inside `dist/` (≈68 MB, largest file 9 MB).
No server code, database or build step is required.

## 1. Put it online (pick one — all free)

### Option A — Cloudflare Pages (recommended)
Fast worldwide, unlimited bandwidth, and has built-in visitor analytics.

**Drag-and-drop, no Git needed**
1. Sign in at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Name the project (e.g. `tape-club`) and drag the **`dist`** folder in.
3. Deploy. Your site is live at `https://tape-club.pages.dev`.

**Or from GitHub (auto-redeploys on every push)**
1. Push this repo to GitHub.
2. Cloudflare → **Create** → **Pages** → **Connect to Git** → choose the repo.
3. Build command: *(leave empty)* · Build output directory: **`dist`**.

**Or from the command line**
```bash
npx wrangler pages deploy dist --project-name tape-club
```

### Option B — Netlify
Go to <https://app.netlify.com/drop> and drag the `dist` folder in. Done.
(From Git: publish directory `dist`, no build command.)

### Option C — Vercel
```bash
npx vercel deploy dist --prod
```

### Option D — GitHub Pages
Push the repo, then **Settings → Pages → Source: GitHub Actions** and use the
"Static HTML" workflow with `path: dist`.

> Keep `music-credits.html` and `MUSIC-LICENSES.md` with the site — the bundled
> Kevin MacLeod tracks are CC BY 4.0 and require attribution.

## 2. See how many people are viewing it

You have two layers. Use either or both.

### a) GoatCounter — already wired into the site
Free, no cookies (so no consent banner), and it also tracks *what people do*,
not just page views.

1. Sign up at <https://www.goatcounter.com/signup> and pick a code, e.g. `tapeclub`
   (your dashboard becomes `https://tapeclub.goatcounter.com`).
2. Open `dist/js/config.js` and set:
   ```js
   export const ANALYTICS_CONFIG={goatcounterCode:'tapeclub',showVisitCount:true};
   ```
3. Redeploy. Visits appear on your dashboard within a minute.
   (Visits from `localhost` are ignored, so local testing doesn't pollute numbers.)

What you'll see in the dashboard:

| Metric | Where |
|---|---|
| Page views & unique visitors per day/hour | Dashboard → `/` |
| Countries, browsers, screen sizes, referrers | Dashboard widgets |
| **Listening events** | Rows named `insert-cassette`, `play-pause`, `eject`, `select-tape-cosmic` … `select-tape-golden`, `add-album-pop` …, `open-add-song`, `open-upload`, `inspect-tape`, `toggle-mode`, `open-help` |

**Public visitor count on the page (optional):** in GoatCounter go to
**Settings → "Allow adding visitor counts on your website"** and save.
The footer will then show e.g. `1,234 VISITS · EST. 2026`. Set
`showVisitCount:false` to hide it.

### b) Your host's built-in analytics (no code)
- **Cloudflare Pages:** project → **Metrics** → enable **Web Analytics**.
- **Netlify:** Site → **Analytics** (paid add-on).
- **Vercel:** Project → **Analytics** → Enable (free tier available).

## 3. Updating the site
Edit files in `dist/`, then re-upload the folder (or `git push` if connected to Git).
Hard-refresh the browser (Ctrl+Shift+R) to see changes immediately.
