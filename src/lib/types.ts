// Shared data types.

/** An uploaded image, stored in Firebase Storage with metadata in Firestore. */
export interface ImageDoc {
  id: string;
  name: string;
  storagePath: string;
  downloadURL: string;
  createdAt: number;
}

/** One transcribed sentence and its (optional) translation. */
export interface Sentence {
  id: string; // stable React key + identity (crypto.randomUUID())
  source: string; // transcribed sentence (Swedish)
  translation: string; // "" until translated (Finnish)
}

/** Token usage + which model/effort produced an output (for A/B + cost). */
export interface OutputMeta {
  model?: string; // API model id, e.g. "claude-opus-4-8"
  effort?: string; // "low" | "medium" | "high"; omitted when default/unsupported
  usage?: { inputTokens: number; outputTokens: number };
}

/** A transcription output for an image. Multiple outputs per image allowed. */
export interface OutputDoc extends OutputMeta {
  id: string;
  imageId: string;
  name: string;
  sentences: Sentence[];
  createdAt: number;
  updatedAt: number;
}
