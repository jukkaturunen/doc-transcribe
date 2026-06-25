"use client";

import { useEffect, useState } from "react";
import type { OutputDoc, Segment } from "@/lib/types";

interface Props {
  output: OutputDoc;
  onOverwrite: (segments: Segment[]) => void;
  onSaveAsNew: (segments: Segment[]) => void;
  onCancel: () => void;
}

/** Edit an output's segments, then overwrite or save as a new output. */
export default function OutputEditor({
  output,
  onOverwrite,
  onSaveAsNew,
  onCancel,
}: Props) {
  const [segments, setSegments] = useState<Segment[]>(output.segments);

  useEffect(() => {
    setSegments(output.segments);
  }, [output]);

  function updateText(index: number, text: string) {
    setSegments((prev) =>
      prev.map((s, i) => (i === index ? { ...s, text } : s)),
    );
  }

  function updatePct(index: number, value: string) {
    const topPercent = Math.max(0, Math.min(100, Number(value) || 0));
    setSegments((prev) =>
      prev.map((s, i) => (i === index ? { ...s, topPercent } : s)),
    );
  }

  function removeSegment(index: number) {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }

  function addSegment() {
    setSegments((prev) => [...prev, { text: "", topPercent: 0 }]);
  }

  return (
    <div>
      <p className="muted">Editing “{output.name}”</p>
      {segments.map((seg, i) => (
        <div className="editor-row" key={i}>
          <input
            className="pct-input"
            type="text"
            value={seg.topPercent}
            onChange={(e) => updatePct(i, e.target.value)}
            aria-label="top percent"
          />
          <textarea
            rows={2}
            value={seg.text}
            onChange={(e) => updateText(i, e.target.value)}
          />
          <button className="danger" onClick={() => removeSegment(i)}>
            ✕
          </button>
        </div>
      ))}

      <div className="editor-actions">
        <button onClick={addSegment}>+ Add segment</button>
        <div style={{ flex: 1 }} />
        <button onClick={onCancel}>Cancel</button>
        <button onClick={() => onSaveAsNew(segments)}>Save as new</button>
        <button className="primary" onClick={() => onOverwrite(segments)}>
          Overwrite
        </button>
      </div>
    </div>
  );
}
