# Doc Transcribe — Implementation Plan

## Context

`prd.md` asks for a web app that transcribes handwritten text from uploaded
images using the Claude API, stores images + transcriptions in Firebase, shows
image and transcription side-by-side, and lets the user click a text segment to
scroll the image to where that text appears. No auth in v1. Deploy to Vercel
(GitHub remote already wired: `jukkaturunen/doc-transcribe`).

The repo is a clean slate (only `prd.md`, no commits). Key constraints decided
with the user:

- **The Claude API key must be server-side only.** Calling Claude from the
  browser leaks the key and is CORS-blocked. A Next.js serverless route holds
  the key as an env var. The key currently in `prd.md` will be **rotated** by
  the user and **scrubbed from `prd.md`**; nothing commits the secret.
- **Model:** `claude-sonnet-4-6` (user-specified; supports vision + structured
  outputs).
- **Firebase:** config is public client config (fine to commit). v1 uses
  **open** Storage + Firestore rules. The **user enables** Firestore + Storage
  in the Firebase console; this plan only writes app code + rules files.

## Stack

- **Next.js 15 (App Router) + TypeScript + React**, deployed on Vercel — gives
  the UI and the serverless API route in one deploy.
- **Firebase Web SDK v10** — Firestore (data) + Storage (image files), used
  client-side with public config.
- **@anthropic-ai/sdk** — used only inside the server route.
- Styling: plain CSS modules / a small CSS file (no heavy UI dep needed).

## Data model (Firestore)

- Collection `images`: `{ id, name, storagePath, downloadURL, createdAt }`
- Collection `outputs`: `{ id, imageId, name, segments: [{text, topPercent}],
  createdAt, updatedAt }` — multiple outputs per image; each OCR run creates a
  new doc. Editing can overwrite (same doc) or save-as-new (new doc).

## Files to create

- `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`,
  `.env.local.example` (documents `ANTHROPIC_API_KEY`; never commit real key).
- `src/lib/firebase.ts` — initialize Firebase app, export `db` + `storage`
  from the public config in the PRD.
- `src/lib/types.ts` — `ImageDoc`, `OutputDoc`, `Segment` types.
- `src/lib/db.ts` — Firestore/Storage helpers: upload image, list/rename/delete
  images, create/list/rename/delete/update outputs.
- `src/app/api/transcribe/route.ts` — **server route**. Receives an image URL
  (or base64), calls `client.messages.create` with `model: "claude-sonnet-4-6"`,
  a vision image block, and `output_config.format` (json_schema) constraining
  the result to `{ segments: [{ text: string, topPercent: number }] }`
  (topPercent 0–100, top of the image = 0). Reads key from
  `process.env.ANTHROPIC_API_KEY`. Returns the parsed segments.
- `src/app/page.tsx` — main UI:
  - Left: image list with upload (Firebase Storage), rename, remove.
  - Selecting an image shows it + its outputs.
  - "Run OCR" button → calls `/api/transcribe` → saves a new output doc.
  - Right: side-by-side view — scrollable image pane + transcription pane
    (segments). Clicking a segment scrolls the image pane so the segment's
    `topPercent` lines up (scrollTop = topPercent/100 * scrollHeight).
  - Output management: rename, remove, edit text, "Overwrite" vs "Save as new".
- `src/app/components/*` — `ImageList`, `SideBySide`, `OutputEditor` (split as
  needed; keep components focused).
- `firestore.rules`, `storage.rules` — open rules for v1 (allow read, write).
  Committed for documentation; the user applies them in the console.
- `README.md` — setup, env var, Firebase enable steps, deploy notes.

## Key implementation notes

- **Structured output** via `output_config: { format: { type: "json_schema",
  schema: {...} } }` on `messages.create` (the canonical param; not the
  deprecated `output_format`). Schema: object with `segments` array, each
  `{ text, topPercent }`, `additionalProperties: false`, all required. Prompt
  instructs Claude to split into sentence-sized pieces and estimate each
  segment's vertical position as a percentage from the top.
- **Image input:** pass the Firebase Storage `downloadURL` as an
  `{ type: "image", source: { type: "url", url } }` block so we don't re-upload
  bytes through our function.
- **Click-to-scroll:** image pane is a fixed-height scroll container; the image
  is rendered at natural width. On segment click, set the container's
  `scrollTop` from `topPercent`. Highlight the active segment.
- **No secret in client bundle:** only `src/app/api/transcribe/route.ts` reads
  `ANTHROPIC_API_KEY`; it runs server-side on Vercel.

## Deployment

- Commit on a branch, push, open/merge per the user's preference (remote
  already set). On Vercel, set the `ANTHROPIC_API_KEY` env var (rotated key).
  Firebase public config is in the committed code.

## Verification

1. `npm run dev`, upload a sample handwriting image → it appears in the list and
   in Storage; a Firestore `images` doc is created.
2. Run OCR → `/api/transcribe` returns segments; an `outputs` doc is saved and
   rendered beside the image.
3. Click a segment → image scrolls to the matching position.
4. Rename/remove an image and an output; edit an output and both overwrite and
   save-as-new; confirm Firestore reflects each.
5. Confirm `ANTHROPIC_API_KEY` is absent from the client bundle (only used in
   the API route) and that no real key is committed.
6. Deploy to Vercel with the env var set; smoke-test the live URL.

## Security cleanup (do as part of this work)

- Scrub the live key from `prd.md`; replace with a note pointing to the env var.
- Ensure `.env.local` is gitignored; ship only `.env.local.example`.
- Remind the user to rotate the exposed key in the Anthropic console.
