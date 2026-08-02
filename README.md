# frenchophile

French vocabulary flashcards. A static site — no build step, no dependencies, no backend.

**Live:** https://msterckx.github.io/frenchophile/

## What it does

- 288 common French words across 15 categories (greetings, food, travel, verbs, …)
- Tap a card to reveal the English meaning, then grade yourself **Again** or **Got it**
- Leitner spaced repetition (1d → 3d → 7d → 16d → 35d), progress saved in the browser
- Pronunciation via the browser's French text-to-speech voice
- Reverse mode (English → French), per-category study, works offline once loaded
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

## Adding words

Append to the array in `words.js`:

```js
{ fr: "le chien", en: "the dog", pos: "n.m.", cat: "Nature" },
```

Nouns include their article. A new `cat` value automatically appears in the category dropdown.
After changing any file, bump `CACHE` in `sw.js` so offline copies refresh.

## Running locally

ES modules need a real server — opening `index.html` from disk won't work:

```sh
python -m http.server 8000   # then visit http://localhost:8000
```

## Deploying

Pushing to `main` publishes automatically, once GitHub Pages is enabled under
**Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**.
