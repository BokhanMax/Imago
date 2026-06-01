# Imago — Online Photo Editor

A lightweight, browser-based photo editor built with Vue 3 and Vite. No installation, no sign-up — open an image and start editing.

🌐 **Live:** [imago.pp.ua](https://imago.pp.ua)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Build tool | Vite 6 |
| Rendering | HTML5 Canvas API (per-layer offscreen canvases) |
| PWA | `vite-plugin-pwa` + Workbox |
| Localisation | `vue-i18n` (Ukrainian / English) |
| Background removal | `@imgly/background-removal` (WASM, runs locally) |

---

## Features

### Canvas & Layers

- Open images via drag & drop or file dialog
- Create a blank canvas with custom size or a preset (web / print formats)
- Multi-layer support: add, remove, reorder, rename, show/hide, lock layers
- Pixel rulers (horizontal + vertical) synced with pan and zoom
- Fit-to-window zoom; manual zoom control

### Tools

- **Move** — pan the canvas
- **Crop** — free or fixed-aspect-ratio crop
- **Resize** — resize canvas with optional proportional constraint
- **Color correction** — brightness, contrast, temperature, saturation (live preview)
- **Spot healing** — remove blemishes with a brush
- **Background removal** — one-click AI-powered removal (runs fully in the browser)
- **Text** — add text with font, size, color, bold/italic/underline/strikethrough
- **Filters** — apply CSS-based visual filters (grayscale, sepia, vivid, dramatic, etc.)

### Export

- Export as **JPEG**, **PNG**, or **WebP**
- Adjustable quality slider

### UX

- Undo / redo (24-step history)
- Keyboard shortcuts: `Ctrl+Z` / `Ctrl+Y`
- Localised UI: Ukrainian and English
- Responsive status bar with app version

---

## Development

```bash
npm install
npm run dev
```

```bash
npm run build
```

Requires Node.js 18+.
