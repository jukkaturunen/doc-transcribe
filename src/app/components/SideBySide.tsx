"use client";

import { useState } from "react";
import type { ImageDoc, OutputDoc } from "@/lib/types";
import OutputEditor from "./OutputEditor";

interface Props {
  image: ImageDoc;
  outputs: OutputDoc[];
  activeOutputId: string | null;
  onSelectOutput: (id: string) => void;
  onRenameOutput: (output: OutputDoc) => void;
  onDeleteOutput: (output: OutputDoc) => void;
  onOverwriteOutput: (output: OutputDoc, text: string) => void;
  onSaveAsNewOutput: (text: string) => void;
}

export default function SideBySide({
  image,
  outputs,
  activeOutputId,
  onSelectOutput,
  onRenameOutput,
  onDeleteOutput,
  onOverwriteOutput,
  onSaveAsNewOutput,
}: Props) {
  const [editing, setEditing] = useState(false);

  const activeOutput =
    outputs.find((o) => o.id === activeOutputId) ?? outputs[0] ?? null;

  return (
    <div className="split">
      <div className="image-pane">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.downloadURL} alt={image.name} />
      </div>

      <div className="transcription-pane">
        {outputs.length === 0 && (
          <p className="muted">
            No transcriptions yet. Click “Run OCR” above to create one.
          </p>
        )}

        {outputs.length > 0 && (
          <div className="output-tabs">
            {outputs.map((o) => (
              <button
                key={o.id}
                className={`output-tab${
                  o.id === activeOutput?.id ? " active" : ""
                }`}
                onClick={() => {
                  onSelectOutput(o.id);
                  setEditing(false);
                }}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        {activeOutput && !editing && (
          <>
            <div className="editor-actions" style={{ marginTop: 0 }}>
              <button onClick={() => setEditing(true)}>Edit</button>
              <button onClick={() => onRenameOutput(activeOutput)}>
                Rename
              </button>
              <button
                className="danger"
                onClick={() => onDeleteOutput(activeOutput)}
              >
                Remove
              </button>
            </div>
            <div className="transcription-text">{activeOutput.text}</div>
          </>
        )}

        {activeOutput && editing && (
          <OutputEditor
            output={activeOutput}
            onCancel={() => setEditing(false)}
            onOverwrite={(text) => {
              onOverwriteOutput(activeOutput, text);
              setEditing(false);
            }}
            onSaveAsNew={(text) => {
              onSaveAsNewOutput(text);
              setEditing(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
