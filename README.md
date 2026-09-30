# frenchophile

French vocabulary flashcards with Dutch glosses. A static site — no build step, no dependencies,
no backend.

**Live:** https://msterckx.github.io/frenchophile/

## What it does

- A personal list of 329 words and expressions across 15 categories
- Tap a card to reveal the Dutch meaning, then grade yourself **Again** or **Got it**
- Leitner spaced repetition (1d → 3d → 7d → 16d → 35d), progress saved in the browser
- Pronunciation via the browser's French text-to-speech voice
- Reverse mode (Dutch → French), per-category study, works offline once loaded
- Filter to recently added words: newest batch, last 2 weeks or last month
- Keyboard: <kbd>Space</kbd> flip · <kbd>←</kbd> again · <kbd>→</kbd> got it · <kbd>S</kbd> speak

Progress lives in `localStorage`, so it's per-device and doesn't sync between phone and laptop.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup |
| `styles.css` | Styling (dark + light via `prefers-color-scheme`) |
| `app.js` | Scheduling, rendering, speech |
| `words.js` | The word list |
| `sw.js` | Service worker for offline use |
| `archive/` | Local snapshots of earlier word lists (git-ignored, not published) |

## Adding words

Append to the array in `words.js`:

```js
{ fr: "le poulailler", nl: "kippenhok", pos: "n.m.", cat: "Nature", added: "2026-09-30" },
```

`added` is the date the word went in (YYYY-MM-DD). Words sharing the latest date form the
"Newest batch" filter.

Nouns include their article, verbs go in the infinitive. `pos` is free text (`n.m.`, `n.f.`,
`n.m.pl`, `n.f.pl`, `v`, `adj`, `adv`, `expr`). A new `cat` value automatically appears in the
category dropdown. Each `fr` value must be unique — progress is keyed by it.

After changing any file, bump `CACHE` in `sw.js` so offline copies refresh.

## Running locally

ES modules need a real server — opening `index.html` from disk won't work:

```sh
python -m http.server 8000   # then visit http://localhost:8000
```

## Deploying

Pushing to `main` triggers `.github/workflows/pages.yml`, which publishes the site.
Requires **Settings → Pages → Source: GitHub Actions**.

## Listening

- [Français Authentique](https://www.francaisauthentique.com/)
- [InnerFrench](https://innerfrench.com/)
- [Le Français Facile (RFI)](https://francaisfacile.rfi.fr/)
