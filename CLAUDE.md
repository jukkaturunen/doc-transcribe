# CLAUDE.md — Doc Transcribe

Bootstrap context for future coding sessions. Read this first.

## What this app is

Web app for transcribing handwritten text from uploaded images using the Claude
API. Images and transcriptions are stored in Firebase. The UI shows an image and
its transcription side-by-side. Transcriptions are split into sentences; each
sentence can be edited and translated (Swedish→Finnish) inline. No
authentication in v1. Original product spec: `prd.md`. Implementation plan:
`plan.md`.

Note: the original spec had a click-a-segment-to-scroll-the-image feature using
per-segment position estimates. That was removed (the position matching was
unreliable). Output is a list of sentences (source + translation).

## Stack

- **Next.js (App Router) + TypeScript + React** — UI + serverless API routes.
- **Firebase Web SDK** — Firestore (data) + Storage (image files). Used
  client-side with the **public** config in `src/lib/firebase.ts` (safe to
  commit; it is client config, not a secret).
- **@anthropic-ai/sdk** — used **only** in the server route.
- Deployed on **Vercel** (GitHub remote: `jukkaturunen/doc-transcribe`).

## Critical rules

- **API keys are server-side only.** `ANTHROPIC_API_KEY` is read **only** inside
  `src/app/api/transcribe/route.ts`; `GOOGLE_TRANSLATE_API_KEY` (Google Cloud
  Translation v2) **only** inside `src/app/api/translate/route.ts`. Never import
  either into client code, never put them in `NEXT_PUBLIC_*`, never commit a real
  key. Local dev uses `.env.local` (gitignored); `.env.local.example` documents
  both variables.
- **Model is `claude-sonnet-4-6`** (user-specified). It supports vision +
  structured outputs. Do not silently swap models.
- Firebase public config may be committed. Firestore/Storage rules are **open**
  for v1 (see `firestore.rules`, `storage.rules`).

## Claude API usage (the OCR call)

In `src/app/api/transcribe/route.ts`:

- `client.messages.create({ model: "claude-sonnet-4-6", max_tokens, ... })`.
- Image passed as a vision block: `{ type: "image", source: { type: "url",
  url: <firebase downloadURL> } }`.
- The system prompt is `OCR_PROMPT` from `src/lib/prompt.ts` (shared so the
  "View prompt" UI shows the exact same text). Its rules: produce complete
  sentences (rejoin words hyphenated across line breaks, keep real hyphens);
  read interlinear/marginal insertions and wrap them in `{ }`; wrap uncertain
  readings in `[ ]` (`[?]`/`[illegible?]` for unknown, `[a/b]` for
  alternatives).
- The route returns `{ sentences: string[] }`. It takes the model's single text
  block and splits it with `splitIntoSentences` from `src/lib/sentences.ts`
  (deterministic, bracket-aware, handles decimals/abbreviations). No tool use.

## Translation (Google Cloud Translation v2)

In `src/app/api/translate/route.ts`:

- `POST` body `{ texts: string[], source?, target? }` → `{ translations:
  string[], source, target }`. Defaults `sv`→`fi`. Sends `q` as an **array** so
  Google returns translations in order — keeps sentences aligned one-to-one
  (translating the whole blob at once mangled newlines).
- Client calls it via `translateTexts` in `src/lib/translate.ts` (used for both
  "Translate all" and per-sentence re-translate).

## Data model (Firestore)

- `images`: `{ id, name, storagePath, downloadURL, createdAt }`
- `outputs`: `{ id, imageId, name, sentences: Sentence[], createdAt, updatedAt }`
  where `Sentence = { id, source, translation }` (`translation` is `""` until
  translated). Multiple outputs per image; each OCR run = a new doc. Sentence
  edits + translations auto-save in place (`updateOutputSentences`). Rename/remove
  supported on both images and outputs.

Types live in `src/lib/types.ts`; all Firestore/Storage access goes through
`src/lib/db.ts`. `listOutputs` filters by `imageId` only and sorts client-side
to avoid needing a Firestore composite index, and `normalizeOutput` back-fills
`sentences` for legacy docs that stored a single `text` blob.

## Key UI behavior

`src/app/page.tsx` + `src/app/components/*`:

- Left: collapsible image list — upload, rename, remove. Toggle with « (hide)
  and the floating ☰ (show).
- Right: image pane + transcription pane separated by a **draggable divider**
  (`.split-divider`, always adjustable). The transcription pane is a list of
  editable sentence rows (`SentenceRow`): each sentence auto-saves on blur and
  shows its Finnish translation beneath it, with a small ⟳ per-sentence
  re-translate button. Pane toolbar: **Translate all**, **Export** (downloads a
  `.txt` — full transcription, then full translation), Rename, Remove, plus an
  output-tab per OCR run.
- Top toolbar: "Run OCR" and "View prompt" (opens a modal showing `OCR_PROMPT`).

## Commands

- `npm install` — install deps.
- `npm run dev` — local dev (http://localhost:3000).
- `npm run build` — production build (also the Vercel build).
- `npm run lint` — lint.

## Setup checklist (first run / new environment)

1. `npm install`.
2. In the Firebase console for project `transcribe-78477`: enable **Firestore**
   and **Storage**; apply rules from `firestore.rules` / `storage.rules`.
3. Create `.env.local` with `ANTHROPIC_API_KEY=...` (a rotated key — the one in
   the original PRD was exposed and must not be used) and
   `GOOGLE_TRANSLATE_API_KEY=...` (enable "Cloud Translation API" in a Google
   Cloud project, create an API key).
4. On Vercel: set `ANTHROPIC_API_KEY` and `GOOGLE_TRANSLATE_API_KEY` in project
   env vars.

## Gotchas

- Don't call Claude from the browser — CORS-blocked and leaks the key.
- Firebase Storage CORS may need configuring if image fetches fail from the
  browser; downloadURLs from the SDK normally work.
- When passing the image to Claude, use the Storage `downloadURL` (a `url`
  source) rather than re-uploading bytes through the function.
