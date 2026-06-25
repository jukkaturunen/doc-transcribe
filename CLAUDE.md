# CLAUDE.md — Doc Transcribe

Bootstrap context for future coding sessions. Read this first.

## What this app is

Web app for transcribing handwritten text from uploaded images using the Claude
API. Images and transcriptions are stored in Firebase. The UI shows an image and
its transcription side-by-side; clicking a text segment scrolls the image to the
estimated vertical position where that text appears. No authentication in v1.
Original product spec: `prd.md`. Implementation plan: `plan.md`.

## Stack

- **Next.js (App Router) + TypeScript + React** — UI + serverless API routes.
- **Firebase Web SDK** — Firestore (data) + Storage (image files). Used
  client-side with the **public** config in `src/lib/firebase.ts` (safe to
  commit; it is client config, not a secret).
- **@anthropic-ai/sdk** — used **only** in the server route.
- Deployed on **Vercel** (GitHub remote: `jukkaturunen/doc-transcribe`).

## Critical rules

- **The Claude API key is server-side only.** It lives in the
  `ANTHROPIC_API_KEY` env var and is read **only** inside
  `src/app/api/transcribe/route.ts`. Never import it into client code, never put
  it in `NEXT_PUBLIC_*`, never commit a real key. Local dev uses `.env.local`
  (gitignored); `.env.local.example` documents the variable.
- **Model is `claude-sonnet-4-6`** (user-specified). It supports vision +
  structured outputs. Do not silently swap models.
- Firebase public config may be committed. Firestore/Storage rules are **open**
  for v1 (see `firestore.rules`, `storage.rules`).

## Claude API usage (the OCR call)

In `src/app/api/transcribe/route.ts`:

- `client.messages.create({ model: "claude-sonnet-4-6", max_tokens, ... })`.
- Image passed as a vision block: `{ type: "image", source: { type: "url",
  url: <firebase downloadURL> } }`.
- Structured output via `output_config: { format: { type: "json_schema",
  schema } }` (the canonical param — NOT the deprecated `output_format`).
- Schema: `{ segments: [{ text: string, topPercent: number }] }`,
  `additionalProperties: false`, all fields required. `topPercent` is 0–100,
  where 0 = top of the image. Prompt Claude to split into sentence-sized pieces
  and estimate each piece's vertical position.

## Data model (Firestore)

- `images`: `{ id, name, storagePath, downloadURL, createdAt }`
- `outputs`: `{ id, imageId, name, segments: Segment[], createdAt, updatedAt }`
  Multiple outputs per image; each OCR run = a new doc. Edit can **overwrite**
  (same doc) or **save as new** (new doc). Rename/remove supported on both
  images and outputs.

Types live in `src/lib/types.ts`; all Firestore/Storage access goes through
`src/lib/db.ts`.

## Key UI behavior

`src/app/page.tsx` + `src/app/components/*`:

- Left: image list — upload, rename, remove.
- Right: side-by-side image pane (scroll container) + transcription pane.
- Click a segment → set image pane `scrollTop = topPercent/100 * scrollHeight`,
  highlight the active segment.

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
   the original PRD was exposed and must not be used).
4. On Vercel: set `ANTHROPIC_API_KEY` in project env vars.

## Gotchas

- Don't call Claude from the browser — CORS-blocked and leaks the key.
- Firebase Storage CORS may need configuring if image fetches fail from the
  browser; downloadURLs from the SDK normally work.
- When passing the image to Claude, use the Storage `downloadURL` (a `url`
  source) rather than re-uploading bytes through the function.
