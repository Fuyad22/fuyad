# Fuyad Hassan — Portfolio

Personal portfolio site. Static HTML/CSS/JS, no build step, no dependencies.

## Run locally

Just open `index.html` in a browser, or serve the folder with any static server, e.g.:

```bash
npx serve .
```

## Structure

- `index.html` — all page content/sections
- `css/styles.css` — design tokens, layout, components, animations
- `js/main.js` — interactive hero dot field, text animations, scroll reveals, pill nav,
  project filters, command palette (Ctrl/⌘ K), live GitHub repo count, animations on/off switch
- `assets/` — favicon and other static assets

All motion respects `prefers-reduced-motion` and the footer "Animations" switch.

## Deploy

Served by GitHub Pages from the `Fuyad22/fuyad` repo (branch `main`, root) at
https://fuyad22.github.io/fuyad/.
