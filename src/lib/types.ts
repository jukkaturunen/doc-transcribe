// Shared data types.

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
  text: string;
  createdAt: number;
  updatedAt: number;
}
