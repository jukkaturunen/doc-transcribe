// Firestore + Storage access helpers. All persistence goes through here.
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase";
import type { ImageDoc, OutputDoc } from "./types";

const IMAGES = "images";
const OUTPUTS = "outputs";

// ---------- Images ----------

export async function uploadImage(file: File): Promise<ImageDoc> {
  const storagePath = `images/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  const data = {
    name: file.name,
    storagePath,
    downloadURL,
    createdAt: Date.now(),
  };
  const docRef = await addDoc(collection(db, IMAGES), data);
  return { id: docRef.id, ...data };
}

export async function listImages(): Promise<ImageDoc[]> {
  const q = query(collection(db, IMAGES), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ImageDoc, "id">) }));
}

export async function renameImage(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, IMAGES, id), { name });
}

export async function deleteImage(image: ImageDoc): Promise<void> {
  // Remove the stored file (ignore if already gone), then the doc + its outputs.
  try {
    await deleteObject(ref(storage, image.storagePath));
  } catch {
    // file may not exist; continue
  }
  const outputs = await listOutputs(image.id);
  await Promise.all(outputs.map((o) => deleteOutput(o.id)));
  await deleteDoc(doc(db, IMAGES, image.id));
}

// ---------- Outputs ----------

export async function createOutput(
  imageId: string,
  name: string,
  text: string,
): Promise<OutputDoc> {
  const now = Date.now();
  const data = { imageId, name, text, createdAt: now, updatedAt: now };
  const docRef = await addDoc(collection(db, OUTPUTS), data);
  return { id: docRef.id, ...data };
}

export async function listOutputs(imageId: string): Promise<OutputDoc[]> {
  // Filter by imageId only (single-field, no composite index needed) and sort
  // by createdAt client-side.
  const q = query(collection(db, OUTPUTS), where("imageId", "==", imageId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<OutputDoc, "id">) }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function renameOutput(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, OUTPUTS, id), { name });
}

export async function updateOutputText(id: string, text: string): Promise<void> {
  await updateDoc(doc(db, OUTPUTS, id), { text, updatedAt: Date.now() });
}

export async function deleteOutput(id: string): Promise<void> {
  await deleteDoc(doc(db, OUTPUTS, id));
}
