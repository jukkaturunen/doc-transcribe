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
Work in natural reading order (top to bottom), then call the
record_transcription tool with all the segments.`;

// The tool's input schema IS our output shape. Forcing the model to call this
// tool means the SDK returns an already-parsed object — no fragile text-JSON
// parsing.
const TOOL: Anthropic.Tool = {
  name: "record_transcription",
  description: "Record the transcribed handwriting as positioned segments.",
  input_schema: {
    type: "object",
    properties: {
      segments: {
        type: "array",
        description: "Transcription segments in top-to-bottom reading order.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "The transcribed text." },
            topPercent: {
              type: "number",
              description:
                "Vertical position from the top of the image, 0 (top) to 100 (bottom).",
            },
          },
          required: ["text", "topPercent"],
        },
      },
    },
    required: ["segments"],
  },
};

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
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text: "Transcribe this handwritten image and record the positioned segments.",
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "No transcription returned." },
        { status: 502 },
      );
    }

    const input = toolUse.input as { segments?: Array<{ text?: unknown; topPercent?: unknown }> };
    const segments: Segment[] = (input.segments ?? []).map((s) => ({
      text: String(s.text ?? ""),
      topPercent: Math.max(0, Math.min(100, Number(s.topPercent) || 0)),
    }));

    return NextResponse.json({ segments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
