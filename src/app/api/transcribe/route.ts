// Server-side OCR route. The Claude API key is read here and ONLY here.
// Never move this logic to the client — it would leak the key and be CORS-blocked.
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { Segment } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an OCR engine for handwritten text.
Transcribe the handwriting in the image as faithfully as possible.
Split the transcription into segments roughly the size of a sentence (or a short
line if sentences are not clear). For each segment, estimate where its text
appears vertically in the image as a percentage from the TOP of the image:
0 means the very top edge, 100 means the very bottom edge.
Return the segments in natural reading order (top to bottom).

Respond with ONLY a JSON object, no markdown fences and no surrounding prose,
matching exactly this shape:
{"segments":[{"text":"<string>","topPercent":<number 0-100>}, ...]}`;

/** Extract a JSON object from the model's text, tolerating stray fences/prose. */
function parseSegments(raw: string): Segment[] {
  let text = raw.trim();
  // Strip ```json ... ``` fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Fall back to the first {...} block.
  if (!text.startsWith("{")) {
    const brace = text.match(/\{[\s\S]*\}/);
    if (brace) text = brace[0];
  }
  const parsed = JSON.parse(text) as { segments?: Segment[] };
  return (parsed.segments ?? []).map((s) => ({
    text: String(s.text ?? ""),
    topPercent: Math.max(0, Math.min(100, Number(s.topPercent) || 0)),
  }));
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
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text: "Transcribe this handwritten image into positioned segments as JSON.",
            },
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

    const segments = parseSegments(textBlock.text);
    return NextResponse.json({ segments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
