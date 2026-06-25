"use client";

import { useEffect, useState } from "react";
import type { OutputDoc } from "@/lib/types";

interface Props {
  output: OutputDoc;
  onOverwrite: (text: string) => void;
  onSaveAsNew: (text: string) => void;
  onCancel: () => void;
}

/** Edit an output's text, then overwrite it or save as a new output. */
export default function OutputEditor({
  output,
  onOverwrite,
  onSaveAsNew,
  onCancel,
}: Props) {
  const [text, setText] = useState(output.text);

  useEffect(() => {
    setText(output.text);
  }, [output]);

  return (
    <div>
      <p className="muted">Editing “{output.name}”</p>
      <textarea
        className="edit-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="editor-actions">
        <div style={{ flex: 1 }} />
        <button onClick={onCancel}>Cancel</button>
        <button onClick={() => onSaveAsNew(text)}>Save as new</button>
        <button className="primary" onClick={() => onOverwrite(text)}>
          Overwrite
        </button>
      </div>
    </div>
  );
}
