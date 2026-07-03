// Server-side translation route. The Google API key is read here and ONLY here.
// Never move this to the client — it would leak the key.
// Uses the Google Cloud Translation API v2 (simple REST + API-key auth).
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const DEFAULT_SOURCE = "sv"; // Swedish
const DEFAULT_TARGET = "fi"; // Finnish

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_TRANSLATE_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let texts: unknown;
  let source = DEFAULT_SOURCE;
  let target = DEFAULT_TARGET;
  try {
    const body = await request.json();
    texts = body?.texts;
    if (typeof body?.source === "string") source = body.source;
    if (typeof body?.target === "string") target = body.target;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (
    !Array.isArray(texts) ||
    texts.length === 0 ||
    !texts.every((t) => typeof t === "string")
  ) {
    return NextResponse.json(
      { error: "Missing texts (expected a non-empty string array)." },
      { status: 400 },
    );
  }

  try {
    // Google v2 accepts `q` as an array and returns translations in the same
    // order — this keeps our sentences aligned one-to-one (N in → N out).
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, source, target, format: "text" }),
    });
    const data = await res.json();
    if (!res.ok) {
      const message =
        data?.error?.message ?? `Translation failed (HTTP ${res.status}).`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const raw: unknown = data?.data?.translations;
    if (!Array.isArray(raw) || raw.length !== texts.length) {
      return NextResponse.json(
        { error: "Unexpected translation response." },
        { status: 502 },
      );
    }
    const translations = raw.map(
      (t: { translatedText?: string }) => t?.translatedText ?? "",
    );

    return NextResponse.json({ translations, source, target });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
