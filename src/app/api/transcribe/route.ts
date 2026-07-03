// Server-side OCR route. The Claude API key is read here and ONLY here.
// Never move this logic to the client — it would leak the key and be CORS-blocked.
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { OCR_PROMPT } from "@/lib/prompt";
import { splitIntoSentences } from "@/lib/sentences";
import { DEFAULT_MODEL, findModel, isValidEffort } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let imageUrl: string | undefined;
  let modelId: string = DEFAULT_MODEL;
  let effort: string | undefined;
  try {
    const body = await request.json();
    imageUrl = body?.imageUrl;
    // Validate model against the allowlist; fall back to the default.
    if (typeof body?.model === "string" && findModel(body.model)) {
      modelId = body.model;
    }
    if (typeof body?.effort === "string") effort = body.effort;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "Missing imageUrl." }, { status: 400 });
  }

  const model = findModel(modelId)!; // guaranteed present (defaulted above)
  // Apply effort only when it's a real level and the model supports it.
  const applyEffort =
    !!effort &&
    effort !== "default" &&
    isValidEffort(effort) &&
    model.supportsEffort;

  const client = new Anthropic({ apiKey });

  try {
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: model.id,
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
    };
    if (applyEffort) {
      // output_config.effort is GA (no beta header). Cast: the installed SDK
      // types may not yet include output_config.
      (params as unknown as Record<string, unknown>).output_config = {
        effort,
      };
    }

    const response = await client.messages.create(params);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No transcription returned." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      sentences: splitIntoSentences(textBlock.text),
      model: model.id,
      effort: applyEffort ? effort : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
