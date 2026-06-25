# Doc Transcribe

Web app for transcribing handwritten text from images using the Claude API.
Upload images, run OCR (which returns sentence-sized segments with an estimated
vertical position), and view image + transcription side-by-side — click a
segment to scroll the image to where that text appears. Images and
transcriptions are stored in Firebase. No authentication in v1.

See `prd.md` for the original spec, `plan.md` for the implementation plan, and
`CLAUDE.md` for developer/agent context.

## Stack

- Next.js (App Router) + TypeScript + React
- Firebase (Firestore + Storage) — public client config
- Claude API (`claude-sonnet-4-6`) via a server-side route
- Deploys to Vercel

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. In the [Firebase console](https://console.firebase.google.com/) for project
   `transcribe-78477`:
   - Enable **Cloud Firestore**.
   - Enable **Storage**.
   - Apply the rules in `firestore.rules` and `storage.rules` (open access for
     v1 — no auth).
3. Create `.env.local` (copy `.env.local.example`) and set a **rotated** Claude
   API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   > The key originally pasted in `prd.md` was exposed and has been removed —
   > generate a fresh one in the Anthropic console.
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## How it works

- **Upload** writes the file to Firebase Storage and a metadata doc to the
  `images` Firestore collection.
- **Run OCR** posts the image's download URL to `/api/transcribe`. That
  server-side route (the only place the API key is read) calls Claude with the
  image and asks for JSON segments `{ text, topPercent }`. The result is saved
  as a new doc in the `outputs` collection — each run creates a new output.
- Outputs can be renamed, removed, and edited; edits can **overwrite** the
  existing output or **save as a new** one.
- Clicking a segment scrolls the image pane to `topPercent` of the image height.

## Security notes

- The Claude API key is **server-side only** (`ANTHROPIC_API_KEY`). It is never
  bundled into client code. Do not prefix it with `NEXT_PUBLIC_`.
- Firebase config in `src/lib/firebase.ts` is public client config (safe to
  commit).
- v1 Firestore/Storage rules are open. Tighten them when adding auth.

## Deploy (Vercel)

1. Push to the GitHub repo connected to Vercel (`jukkaturunen/doc-transcribe`).
2. In the Vercel project settings, add the `ANTHROPIC_API_KEY` environment
   variable (the rotated key).
3. Deploy. Firebase public config ships with the build.
