// Server-side OCR route. The Claude API key is read here and ONLY here.
// Never move this logic to the client — it would leak the key and be CORS-blocked.
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { OCR_PROMPT } from "@/lib/prompt";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

// Deterministically split transcription into one sentence per line. We do this
// server-side rather than trusting the model, which is unreliable at it.
// Rules: collapse the model's own whitespace/line breaks, then break after
// sentence-ending punctuation (. ! ?) — but never inside the [ ] / { } markers
// the prompt uses (e.g. "[illegible?]"), and only when the next sentence
// plausibly starts (uppercase/quote/opening bracket/digit), so decimals
// ("3.5") and abbreviations followed by lowercase ("e.g. the") stay intact.
const TRAILING = /[.!?"'”’)\]]/; // terminals + closing quotes/brackets
const SENTENCE_START = /[A-Z0-9"'“‘([{]/;

function splitSentences(text: string): string {
  const s = text.replace(/\s+/g, " ").trim();
  const sentences: string[] = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    buf += ch;
    if (ch === "[" || ch === "{") {
      depth++;
    } else if (ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && (ch === "." || ch === "!" || ch === "?")) {
      // Absorb any run of trailing terminals / closing quotes (e.g. ?!, ..., .")
      let j = i + 1;
      while (j < s.length && TRAILING.test(s[j])) {
        buf += s[j];
        j++;
      }
      // Skip spaces to find where the next sentence would begin.
      let k = j;
      while (k < s.length && s[k] === " ") k++;
      // A decimal like "3.5" has no space, so k stays on the next digit —
      // exclude that case explicitly.
      const isDecimal =
        ch === "." && /\d/.test(s[i - 1] ?? "") && /\d/.test(s[k] ?? "");
      const startsNew =
        !isDecimal && (k >= s.length || SENTENCE_START.test(s[k]));
      if (startsNew) {
        sentences.push(buf.trim());
        buf = "";
        i = k - 1; // resume at the next sentence's first char
      } else {
        i = j - 1; // mid-sentence punctuation; keep going
      }
    }
  }
  if (buf.trim()) sentences.push(buf.trim());
  return sentences.join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let imageUrl: string | undefined;
  try {
    const body = await request.json();
    imageUrl = body?.imageUrl;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "Missing imageUrl." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: OCR_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: "Transcribe this handwritten image." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No transcription returned." },
        { status: 502 },
      );
    }

    return NextResponse.json({ text: splitSentences(textBlock.text) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
