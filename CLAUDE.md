# CLAUDE.md — Doc Transcribe

Bootstrap context for future coding sessions. Read this first.

## What this app is

Web app for transcribing handwritten text from uploaded images using the Claude
API. Images and transcriptions are stored in Firebase. The UI shows an image and
its transcription side-by-side. Transcriptions are split into sentences; each
sentence can be edited and translated (Swedish→Finnish) inline. Access is gated
by a single shared password (no user accounts) — see **Auth** below. Original
product spec: `prd.md`. Implementation plan: `plan.md`.

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
  every variable. `APP_PASSWORD` / `APP_SESSION_SECRET` (the auth gate) are also
  server-side only — never `NEXT_PUBLIC_*`.
- **The OCR model is user-selectable at runtime** (a dropdown in the toolbar),
  not a hardcoded constant. The allowlist + prices + effort support live in
  `src/lib/models.ts`; the default is `claude-sonnet-4-6` (`DEFAULT_MODEL`). The
  client sends `model` (+ optional `effort`) per request; the route validates
  against the allowlist and falls back to the default on anything unknown. Add
  new models only in `src/lib/models.ts`. Recommended for handwriting: Sonnet 5
  (`claude-sonnet-5`) or Opus 4.8 (both higher-capability; Opus has high-res
  vision). Haiku 4.5 does **not** support the `effort` parameter (it 400s), so
  the route drops effort for it.
- Firebase public config may be committed. Firestore/Storage rules are **open**
  for v1 (see `firestore.rules`, `storage.rules`).

## Claude API usage (the OCR call)

In `src/app/api/transcribe/route.ts`:

- `client.messages.create({ model, max_tokens, ... })` where `model` comes from
  the request (validated against `src/lib/models.ts`). When the request includes
  a real `effort` (`low`/`medium`/`high`) and the model supports it, the route
  adds `output_config: { effort }` (GA, no beta header; cast because the installed
  SDK types may lag). Effort is dropped for `default` and for Haiku 4.5.
- Image passed as a vision block: `{ type: "image", source: { type: "url",
  url: <firebase downloadURL> } }`.
- The system prompt is `OCR_PROMPT` from `src/lib/prompt.ts` (shared so the
  "View prompt" UI shows the exact same text). Its rules: produce complete
  sentences (rejoin words hyphenated across line breaks, keep real hyphens);
  read interlinear/marginal insertions and wrap them in `{ }`; wrap uncertain
  readings in `[ ]` (`[?]`/`[illegible?]` for unknown, `[a/b]` for
  alternatives).
- The route returns `{ sentences: string[], model, effort, usage: {
  inputTokens, outputTokens } }`. It splits the model's text block with
  `splitIntoSentences` from `src/lib/sentences.ts` (deterministic, bracket-aware,
  handles decimals/abbreviations). No tool use. `usage` drives the per-run cost
  estimate (the API returns tokens, not dollars — cost = tokens × per-model rate
  from `src/lib/models.ts`, shown under the active output tab).

## Translation (Google Cloud Translation v2)

In `src/app/api/translate/route.ts`:

- `POST` body `{ texts: string[], source?, target? }` → `{ translations:
  string[], source, target }`. Defaults `sv`→`fi`. Sends `q` as an **array** so
  Google returns translations in order — keeps sentences aligned one-to-one
  (translating the whole blob at once mangled newlines).
- Client calls it via `translateTexts` in `src/lib/translate.ts` (used for both
  "Translate all" and per-sentence re-translate).

## Auth (single shared password)

No accounts — one password gates the whole app **and** the paid API routes.
Stateless bearer-cookie model:

- `src/middleware.ts` runs on every route except `/login`, `/api/login`, and
  static assets (see its `matcher`). It allows a request only when the
  `dt_session` cookie matches `APP_SESSION_SECRET` (constant-time compare).
  Otherwise: `/api/*` → **401 JSON**, page navigations → **redirect to
  `/login`**. This is the real protection — the middleware, not the UI.
- `src/app/api/login/route.ts`: `POST` checks the submitted password against
  `APP_PASSWORD` and, on success, sets the HttpOnly `dt_session` cookie
  (`Secure` in prod, `SameSite=Lax`, 30-day). `DELETE` clears it (logout).
- `src/app/login/page.tsx` is the login form; `page.tsx` has a "Log out" button.
- Cookie name lives in `src/lib/auth.ts` (`SESSION_COOKIE`), shared by middleware
  and the route so they can't drift.

Rotating `APP_SESSION_SECRET` invalidates all existing sessions. The secret never
reaches browser JS (HttpOnly), and the login form is the only thing that submits
the password.

## Data model (Firestore)

- `images`: `{ id, name, storagePath, downloadURL, createdAt }`
- `outputs`: `{ id, imageId, name, sentences: Sentence[], createdAt, updatedAt,
  model?, effort?, usage? }` where `Sentence = { id, source, translation }`
  (`translation` is `""` until translated) and `model`/`effort`/`usage` record
  which model produced the run (for A/B + cost; optional, back-filled absent on
  legacy docs). Multiple outputs per image; each OCR run = a new doc. Sentence
  edits + translations auto-save in place (`updateOutputSentences`). Rename/remove
  supported on both images and outputs.

Types live in `src/lib/types.ts`; all Firestore/Storage access goes through
`src/lib/db.ts`. `listOutputs` filters by `imageId` only and sorts client-side
to avoid needing a Firestore composite index, and `normalizeOutput` back-fills
`sentences` for legacy docs that stored a single `text` blob.

## Key UI behavior

`src/app/page.tsx` + `src/app/components/*`:

- Left: collapsible image list — upload, rename, remove, and a **Log out**
  button pinned to the sidebar footer. Toggle with « (hide) and the floating ☰
  (show).
- Right: image pane + transcription pane separated by a **draggable divider**
  (`.split-divider`, always adjustable). The transcription pane is a list of
  editable sentence rows (`SentenceRow`): each sentence auto-saves on blur and
  shows its Finnish translation beneath it, with a small ✕ (left, deletes the
  sentence + its translation) and a ⟳ per-sentence re-translate button. Pane
  toolbar: **Translate all**, **Export** (downloads a `.txt` — full
  transcription, then full translation), Rename, Remove, plus an output-tab per
  OCR run.
- Top toolbar (only when an image is selected): "Run OCR", **Model** and
  **Effort** dropdowns (from `src/lib/models.ts`; Effort disabled/"n/a" for Haiku
  4.5), and "View prompt" (modal showing `OCR_PROMPT`). The active output shows a
  meta line with its model · effort · estimated cost.

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
   the original PRD was exposed and must not be used),
   `GOOGLE_TRANSLATE_API_KEY=...` (enable "Cloud Translation API" in a Google
   Cloud project, create an API key), `APP_PASSWORD=...` (the login password),
   and `APP_SESSION_SECRET=...` (a long random string, e.g. `openssl rand -hex
   32`).
4. On Vercel: set all four (`ANTHROPIC_API_KEY`, `GOOGLE_TRANSLATE_API_KEY`,
   `APP_PASSWORD`, `APP_SESSION_SECRET`) in project env vars.

## Gotchas

- Don't call Claude from the browser — CORS-blocked and leaks the key.
- Firebase Storage CORS may need configuring if image fetches fail from the
  browser; downloadURLs from the SDK normally work.
- When passing the image to Claude, use the Storage `downloadURL` (a `url`
  source) rather than re-uploading bytes through the function.
