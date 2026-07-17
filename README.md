# SoundCheck

An offline-first English pronunciation practice PWA for Chinese learners. Read a sentence out loud, get a per-word pronunciation score, and tap any word to hear its standard pronunciation and IPA transcription — all running entirely in the browser, no server-side inference.

Live: https://soundcheck-bx8.pages.dev/

## How it works

1. **Speech model**: `facebook/wav2vec2-base-960h`, converted to ONNX and INT8-quantized (~90MB), run client-side via [ONNX Runtime Web](https://onnxruntime.ai/) (WASM backend, no WebGPU/JSEP).
2. **Recording**: hold the mic button → `MediaRecorder` captures audio → resampled to 16kHz mono via `OfflineAudioContext` → fed into the model as a raw waveform.
3. **Scoring**: the model outputs per-frame CTC logits. A monotone greedy forced-alignment algorithm (`src/lib/align.ts`) matches each expected character to its best-scoring time frame, in left-to-right order, then averages character log-probabilities per word to produce a 0–100 score.
4. **Everything after the first load works offline** — the model, WASM runtime, and vocab are cached (IndexedDB + Service Worker), so there's no network dependency once installed.

## Features

- **Built-in practice sentences** — curated example sentences with lesson labels, Chinese translations, and hand-written pronunciation tips per word.
- **Document read-along mode** — paste any text, optionally auto-split it into one-sentence-per-line (with an abbreviation-aware sentence splitter), then practice each line with the same recording/scoring flow. Drafts persist in `localStorage`.
- **Word detail popup** — tap any scored word to see its IPA phonetic transcription, hear it spoken via `SpeechSynthesisUtterance`, and (for built-in sentences) read a pronunciation tip.
- **Installable PWA** — works fully offline after first load, including on mobile.

## Architecture

### Screen flow (`src/App.tsx`)

A simple `useState` state machine — no router — switches between four screens once the model has finished loading:

```
LoadingScreen (always mounted, cross-fades out via CSS)
  └─ HomeScreen ──────────┬─→ MainScreen (built-in sentences, dot nav)
                          └─→ DocumentInput ─→ MainScreen (parsed sentences, counter nav)
```

`MainScreen` is a single generic component reused by both modes — it takes a `sentences: Sentence[]` prop plus a `navStyle: 'dots' | 'counter'` and an `onExit` callback. Built-in sentences carry optional `lesson`/`translation`/`tips` fields that document-mode sentences simply omit; `MainScreen` renders each conditionally.

### Key modules

| Path | Responsibility |
|---|---|
| `src/lib/model.ts` | Loads the ONNX model (IndexedDB cache → HuggingFace download fallback in production, local file in dev), runs inference |
| `src/lib/align.ts` | CTC log-softmax + monotone forced alignment → per-word scores |
| `src/lib/audioCapture.ts` | Mic recording via `MediaRecorder`, resampling to 16kHz mono |
| `src/lib/phonetic.ts` | `getPhonetic(word)` — IPA lookup (hardcoded for now; swappable for a local dictionary later) + `speakWord()` TTS helper |
| `src/lib/sentenceSplit.ts` | Abbreviation-aware sentence boundary detection for the "auto-split" button in document mode |
| `src/lib/documentParse.ts` | Turns newline-separated text into `Sentence[]` |
| `src/lib/documentStore.ts` | `localStorage` persistence for the document-mode draft |
| `src/sw.ts` | Service worker (Workbox `injectManifest`): caches the WASM runtime and (same-origin) ONNX model, injects COOP/COEP headers on every navigation response |
| `src/hooks/useModel.ts` | React hook wrapping `model.ts` load progress/ready/error state |

### Cross-origin isolation (COOP/COEP)

ONNX Runtime Web's multi-threaded WASM backend requires `crossOriginIsolated === true`, which needs both `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` on every response. This is set two ways so it holds even when the Service Worker serves pages from its precache:
- `public/_headers` (Cloudflare Pages header rules)
- `src/sw.ts`'s `fetch` handler injects the headers directly onto every navigation response

### Model hosting

- **Local dev**: `local-models/wav2vec2.onnx` (gitignored — not in the repo, ~90MB) is served at `/models/wav2vec2.onnx` by a small dev-only Vite middleware (see `serveLocalModel()` in `vite.config.ts`), so `npm run dev` doesn't require shipping the file through git.
- **Production**: the model loads from HuggingFace (`Xenova/wav2vec2-base-960h`), which serves proper CORS headers — GitHub Releases (Azure Blob Storage backend) does **not**, so it can't be `fetch()`-ed cross-origin from a deployed PWA even though direct browser navigation to the URL works fine.
- After first download, the model is cached in IndexedDB so subsequent loads are instant and fully offline.
- `scripts/download_model.py` / `scripts/convert_model.py` regenerate the ONNX model from scratch if needed (see file headers for usage).

### Build quirks worth knowing

- `onnxruntime-web` ships four WASM build variants (plain / `jsep` / `asyncify` / `jspi`). This project only imports the `onnxruntime-web/wasm` subpath (no WebGPU), so `scripts/copy-wasm.mjs` (a `postinstall` hook) copies **only** the plain variant into `public/ort-wasm/`. The `jsep` variant alone is 26.8MB, which exceeds Cloudflare Pages' 25MiB per-file limit — copying all four breaks deployment.
- The production build deletes/excludes the local dev model automatically (it was never in `public/`, it lives in the gitignored `local-models/`), so there's no manual cleanup step before deploying.

## Development

```bash
npm install        # also runs postinstall → copies ORT wasm files into public/ort-wasm/
npm run dev         # http://localhost:5173
```

For local model testing, place `wav2vec2.onnx` at `local-models/wav2vec2.onnx` (not tracked in git — download via `scripts/download_model.py` or copy from a previous machine).

```bash
npm run build       # tsc -b && vite build → dist/
npm run lint         # oxlint
```

## Deployment

Auto-deployed via Cloudflare Pages, connected to this GitHub repo's `main` branch:

- **Framework preset**: None (Vite isn't in Cloudflare's preset list — manual settings work identically)
- **Build command**: `npm run build`
- **Build output directory**: `dist`

Every push to `main` triggers a fresh `npm install && npm run build` on Cloudflare's side — no manual `dist/` upload needed.

## Roadmap

- Swap `getPhonetic()`'s hardcoded IPA table for a bundled local dictionary (offline, covers arbitrary words for document mode)
- PDF import for document mode (currently plain text / paste only)
