"use client";

import { useRef, useState } from "react";
import type { ImageDoc, OutputDoc, Segment } from "@/lib/types";
import OutputEditor from "./OutputEditor";

interface Props {
  image: ImageDoc;
  outputs: OutputDoc[];
  activeOutputId: string | null;
  onSelectOutput: (id: string) => void;
  onRenameOutput: (output: OutputDoc) => void;
  onDeleteOutput: (output: OutputDoc) => void;
  onOverwriteOutput: (output: OutputDoc, segments: Segment[]) => void;
  onSaveAsNewOutput: (segments: Segment[]) => void;
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
  const imagePaneRef = useRef<HTMLDivElement>(null);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [markerTop, setMarkerTop] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  const activeOutput =
    outputs.find((o) => o.id === activeOutputId) ?? outputs[0] ?? null;

  function scrollToSegment(index: number, topPercent: number) {
    setActiveSegment(index);
    const pane = imagePaneRef.current;
    if (!pane) return;
    const img = pane.querySelector("img");
    const contentHeight = img ? img.offsetHeight : pane.scrollHeight;
    const target = (topPercent / 100) * contentHeight;
    setMarkerTop(target);
    // Center the target line in the pane when possible.
    pane.scrollTo({ top: target - pane.clientHeight / 2, behavior: "smooth" });
  }

  return (
    <div className="split">
      <div className="image-pane" ref={imagePaneRef}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.downloadURL} alt={image.name} />
        {markerTop !== null && (
          <div className="position-marker" style={{ top: markerTop }} />
        )}
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
                  setActiveSegment(null);
                  setMarkerTop(null);
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
            <div style={{ marginTop: 12 }}>
              {activeOutput.segments.map((seg, i) => (
                <div
                  key={i}
                  className={`segment${activeSegment === i ? " active" : ""}`}
                  onClick={() => scrollToSegment(i, seg.topPercent)}
                  title="Scroll image to this position"
                >
                  <span className="pct">{Math.round(seg.topPercent)}%</span>
                  {seg.text}
                </div>
              ))}
            </div>
          </>
        )}

        {activeOutput && editing && (
          <OutputEditor
            output={activeOutput}
            onCancel={() => setEditing(false)}
            onOverwrite={(segments) => {
              onOverwriteOutput(activeOutput, segments);
              setEditing(false);
            }}
            onSaveAsNew={(segments) => {
              onSaveAsNewOutput(segments);
              setEditing(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
