"use client";

import { useEffect, useState } from "react";
import type { ImageDoc, OutputDoc } from "@/lib/types";
import {
  uploadImage,
  listImages,
  renameImage,
  deleteImage,
  createOutput,
  listOutputs,
  renameOutput,
  deleteOutput,
  updateOutputText,
} from "@/lib/db";
import { OCR_PROMPT } from "@/lib/prompt";
import ImageList from "./components/ImageList";
import SideBySide from "./components/SideBySide";

export default function Home() {
  const [images, setImages] = useState<ImageDoc[]>([]);
  const [activeImage, setActiveImage] = useState<ImageDoc | null>(null);
  const [outputs, setOutputs] = useState<OutputDoc[]>([]);
  const [activeOutputId, setActiveOutputId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(
    null,
  );

  useEffect(() => {
    listImages()
      .then(setImages)
      .catch((e) => setStatus({ text: `Failed to load images: ${e.message}`, error: true }));
  }, []);

  async function selectImage(image: ImageDoc) {
    setActiveImage(image);
    setStatus(null);
    const o = await listOutputs(image.id);
    setOutputs(o);
    setActiveOutputId(o[0]?.id ?? null);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setStatus(null);
    try {
      const image = await uploadImage(file);
      setImages((prev) => [image, ...prev]);
      await selectImage(image);
    } catch (e) {
      setStatus({ text: `Upload failed: ${(e as Error).message}`, error: true });
    } finally {
      setUploading(false);
    }
  }

  async function handleRenameImage(image: ImageDoc) {
    const name = window.prompt("Rename image", image.name);
    if (!name || name === image.name) return;
    await renameImage(image.id, name);
    setImages((prev) => prev.map((i) => (i.id === image.id ? { ...i, name } : i)));
    if (activeImage?.id === image.id) setActiveImage({ ...activeImage, name });
  }

  async function handleDeleteImage(image: ImageDoc) {
    if (!window.confirm(`Remove “${image.name}” and its transcriptions?`)) return;
    await deleteImage(image);
    setImages((prev) => prev.filter((i) => i.id !== image.id));
    if (activeImage?.id === image.id) {
      setActiveImage(null);
      setOutputs([]);
      setActiveOutputId(null);
    }
  }

  async function runOcr() {
    if (!activeImage) return;
    setRunning(true);
    setStatus({ text: "Transcribing… this can take a moment." });
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: activeImage.downloadURL }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed.");
      const text: string = data.text ?? "";
      const name = `Transcription ${outputs.length + 1}`;
      const output = await createOutput(activeImage.id, name, text);
      setOutputs((prev) => [...prev, output]);
      setActiveOutputId(output.id);
      setStatus({ text: "Done." });
    } catch (e) {
      setStatus({ text: (e as Error).message, error: true });
    } finally {
      setRunning(false);
    }
  }

  async function handleRenameOutput(output: OutputDoc) {
    const name = window.prompt("Rename transcription", output.name);
    if (!name || name === output.name) return;
    await renameOutput(output.id, name);
    setOutputs((prev) =>
      prev.map((o) => (o.id === output.id ? { ...o, name } : o)),
    );
  }

  async function handleDeleteOutput(output: OutputDoc) {
    if (!window.confirm(`Remove “${output.name}”?`)) return;
    await deleteOutput(output.id);
    setOutputs((prev) => {
      const next = prev.filter((o) => o.id !== output.id);
      if (activeOutputId === output.id) setActiveOutputId(next[0]?.id ?? null);
      return next;
    });
  }

  async function handleOverwriteOutput(output: OutputDoc, text: string) {
    await updateOutputText(output.id, text);
    setOutputs((prev) =>
      prev.map((o) =>
        o.id === output.id ? { ...o, text, updatedAt: Date.now() } : o,
      ),
    );
  }

  async function handleSaveAsNewOutput(text: string) {
    if (!activeImage) return;
    const name = `Transcription ${outputs.length + 1}`;
    const output = await createOutput(activeImage.id, name, text);
    setOutputs((prev) => [...prev, output]);
    setActiveOutputId(output.id);
  }

  return (
    <div className={`app${sidebarOpen ? "" : " sidebar-collapsed"}`}>
      {sidebarOpen && (
        <ImageList
          images={images}
          activeId={activeImage?.id ?? null}
          uploading={uploading}
          onUpload={handleUpload}
          onSelect={selectImage}
          onRename={handleRenameImage}
          onDelete={handleDeleteImage}
          onToggle={() => setSidebarOpen(false)}
        />
      )}

      <main className="main">
        {!sidebarOpen && (
          <button
            className="icon-btn sidebar-show"
            onClick={() => setSidebarOpen(true)}
            title="Show sidebar"
            aria-label="Show sidebar"
          >
            ☰
          </button>
        )}

        {!activeImage && (
          <div className="main-empty">
            Upload or select an image to get started.
          </div>
        )}

        {activeImage && (
          <>
            <div className="toolbar">
              <strong>{activeImage.name}</strong>
              <button
                className="primary"
                onClick={runOcr}
                disabled={running}
              >
                {running ? "Running…" : "Run OCR"}
              </button>
              <button onClick={() => setShowPrompt(true)}>View prompt</button>
              <div className="spacer" />
              {status && (
                <span className={`status${status.error ? " error" : ""}`}>
                  {status.text}
                </span>
              )}
            </div>

            <SideBySide
              image={activeImage}
              outputs={outputs}
              activeOutputId={activeOutputId}
              onSelectOutput={setActiveOutputId}
              onRenameOutput={handleRenameOutput}
              onDeleteOutput={handleDeleteOutput}
              onOverwriteOutput={handleOverwriteOutput}
              onSaveAsNewOutput={handleSaveAsNewOutput}
            />
          </>
        )}
      </main>

      {showPrompt && (
        <div className="modal-overlay" onClick={() => setShowPrompt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>OCR prompt</strong>
              <button className="icon-btn" onClick={() => setShowPrompt(false)}>
                ✕
              </button>
            </div>
            <pre className="prompt-text">{OCR_PROMPT}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
