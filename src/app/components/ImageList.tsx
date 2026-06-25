"use client";

import { useRef } from "react";
import type { ImageDoc } from "@/lib/types";

interface Props {
  images: ImageDoc[];
  activeId: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onSelect: (image: ImageDoc) => void;
  onRename: (image: ImageDoc) => void;
  onDelete: (image: ImageDoc) => void;
  onToggle: () => void;
}

export default function ImageList({
  images,
  activeId,
  uploading,
  onUpload,
  onSelect,
  onRename,
  onDelete,
  onToggle,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Doc Transcribe</h1>
        <button
          className="icon-btn"
          onClick={onToggle}
          title="Hide sidebar"
          aria-label="Hide sidebar"
        >
          «
        </button>
      </div>

      <label className="upload-label">
        {uploading ? "Uploading…" : "+ Upload image"}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            if (fileInput.current) fileInput.current.value = "";
          }}
        />
      </label>

      {images.length === 0 && <p className="muted">No images yet.</p>}

      {images.map((image) => (
        <div
          key={image.id}
          className={`image-item${image.id === activeId ? " active" : ""}`}
        >
          <div className="name" onClick={() => onSelect(image)}>
            {image.name}
          </div>
          <div className="row">
            <button onClick={() => onRename(image)}>Rename</button>
            <button className="danger" onClick={() => onDelete(image)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
