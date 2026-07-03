// OCR model catalog — shared by the transcribe route (allowlist + validation)
// and the client (model/effort dropdowns + cost display). Pure, no secrets.
//
// Prices are effective USD per 1M tokens. Sonnet 5 uses its introductory rate
// ($2/$10), which reverts to $3/$15 after 2026-08-31 — update inputPrice/
// outputPrice then. `effort` (output_config.effort) is supported on every model
// except Haiku 4.5, where it returns a 400.

export interface ModelInfo {
  id: string; // API model id
  label: string; // UI label
  inputPrice: number; // USD per 1M input tokens
  outputPrice: number; // USD per 1M output tokens
  supportsEffort: boolean;
}

export const MODELS: ModelInfo[] = [
  { id: "claude-opus-4-8", label: "Opus 4.8", inputPrice: 5, outputPrice: 25, supportsEffort: true },
  { id: "claude-sonnet-5", label: "Sonnet 5", inputPrice: 2, outputPrice: 10, supportsEffort: true }, // intro pricing thru 2026-08-31
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", inputPrice: 3, outputPrice: 15, supportsEffort: true },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", inputPrice: 1, outputPrice: 5, supportsEffort: false },
  { id: "claude-fable-5", label: "Fable 5", inputPrice: 10, outputPrice: 50, supportsEffort: true },
];

export const DEFAULT_MODEL = "claude-sonnet-4-6"; // preserve current behavior

// "default" means: omit the effort param (API default is high). low/medium/high
// are safe on every effort-supporting model; xhigh/max could be added for Opus.
export const EFFORTS = ["default", "low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];

export function findModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function isValidEffort(effort: string): effort is Effort {
  return (EFFORTS as readonly string[]).includes(effort);
}

// Estimated USD cost of a run from token usage. Returns null if the model or
// usage is unknown (e.g. legacy outputs with no stored usage).
export function estimateCost(
  modelId: string | undefined,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number | null {
  const model = modelId ? findModel(modelId) : undefined;
  if (!model || inputTokens == null || outputTokens == null) return null;
  return (
    (inputTokens / 1_000_000) * model.inputPrice +
    (outputTokens / 1_000_000) * model.outputPrice
  );
}
