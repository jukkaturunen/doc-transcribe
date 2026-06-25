// Shared data types.

/** A transcribed text segment with its estimated vertical position. */
export interface Segment {
  /** Text content of this segment (roughly a sentence). */
  text: string;
  /** Estimated vertical position from the top of the image, 0-100. */
  topPercent: number;
}

/** An uploaded image, stored in Firebase Storage with metadata in Firestore. */
export interface ImageDoc {
  id: string;
  name: string;
  storagePath: string;
  downloadURL: string;
  createdAt: number;
}

/** A transcription output for an image. Multiple outputs per image allowed. */
export interface OutputDoc {
  id: string;
  imageId: string;
  name: string;
  segments: Segment[];
  createdAt: number;
  updatedAt: number;
}
