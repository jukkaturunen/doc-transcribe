"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageDoc, OutputDoc } from "@/lib/types";
import { findModel, estimateCost } from "@/lib/models";
import SentenceRow from "./SentenceRow";

interface Props {
  image: ImageDoc;
  outputs: OutputDoc[];
  activeOutputId: string | null;
  onSelectOutput: (id: string) => void;
  onRenameOutput: (output: OutputDoc) => void;
  onDeleteOutput: (output: OutputDoc) => void;
  onEditSentence: (
    output: OutputDoc,
    sentenceId: string,
    source: string,
  ) => void;
  onDeleteSentence: (output: OutputDoc, sentenceId: string) => void;
  onTranslateAll: (output: OutputDoc) => Promise<void>;
  onTranslateSentence: (output: OutputDoc, sentenceId: string) => Promise<void>;
  onExport: (output: OutputDoc) => void;
}

export default function SideBySide({
  image,
  outputs,
  activeOutputId,
  onSelectOutput,
  onRenameOutput,
  onDeleteOutput,
  onEditSentence,
  onDeleteSentence,
  onTranslateAll,
  onTranslateSentence,
  onExport,
}: Props) {
  const [translatingAll, setTranslatingAll] = useState(false);

  const splitRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.5); // fraction of width given to the image pane
  const draggingRef = useRef(false);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.classList.add("col-resizing");
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const next = (e.clientX - rect.left) / rect.width;
      setRatio(Math.min(0.85, Math.max(0.15, next)));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.classList.remove("col-resizing");
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const activeOutput =
    outputs.find((o) => o.id === activeOutputId) ?? outputs[0] ?? null;

  // "Opus 4.8 · effort: high · ~$0.011" — pieces missing on legacy outputs are omitted.
  function metaLine(o: OutputDoc): string | null {
    const parts: string[] = [];
    if (o.model) parts.push(findModel(o.model)?.label ?? o.model);
    if (o.effort) parts.push(`effort: ${o.effort}`);
    const cost = estimateCost(o.model, o.usage?.inputTokens, o.usage?.outputTokens);
    if (cost != null) parts.push(`~$${cost.toFixed(cost < 0.01 ? 4 : 3)}`);
    return parts.length ? parts.join(" · ") : null;
  }

  async function translateAll() {
    if (!activeOutput) return;
    setTranslatingAll(true);
    try {
      await onTranslateAll(activeOutput);
    } finally {
      setTranslatingAll(false);
    }
  }

  return (
    <div
      className="split"
      ref={splitRef}
      style={{ gridTemplateColumns: `${ratio}fr 6px ${1 - ratio}fr` }}
    >
      <div className="image-pane">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.downloadURL} alt={image.name} />
      </div>

      <div
        className="split-divider"
        onMouseDown={startDrag}
        role="separator"
        aria-orientation="vertical"
      />

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
                onClick={() => onSelectOutput(o.id)}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        {activeOutput && (
          <>
            <div className="editor-actions" style={{ marginTop: 0 }}>
              <button
                className="primary"
                onClick={translateAll}
                disabled={translatingAll || activeOutput.sentences.length === 0}
              >
                {translatingAll ? "Translating…" : "Translate all"}
              </button>
              <button
                onClick={() => onExport(activeOutput)}
                disabled={activeOutput.sentences.length === 0}
              >
                Export
              </button>
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

            {metaLine(activeOutput) && (
              <div className="output-meta">{metaLine(activeOutput)}</div>
            )}

            <div className="sentence-list">
              {activeOutput.sentences.map((s) => (
                <SentenceRow
                  key={s.id}
                  sentence={s}
                  onEdit={(source) =>
                    onEditSentence(activeOutput, s.id, source)
                  }
                  onDelete={() => onDeleteSentence(activeOutput, s.id)}
                  onTranslate={() => onTranslateSentence(activeOutput, s.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
