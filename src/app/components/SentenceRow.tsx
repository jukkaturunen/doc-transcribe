"use client";

import { useEffect, useRef, useState } from "react";
import type { Sentence } from "@/lib/types";

interface Props {
  sentence: Sentence;
  onEdit: (source: string) => void;
  onDelete: () => void;
  onTranslate: () => Promise<void>;
}

// One transcribed sentence: an inline-editable source (auto-saved on blur) with
// its translation shown beneath, a left delete button (removes the sentence and
// its translation), and a per-sentence re-translate button.
export default function SentenceRow({
  sentence,
  onEdit,
  onDelete,
  onTranslate,
}: Props) {
  const [value, setValue] = useState(sentence.source);
  const [translating, setTranslating] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Keep local value in sync when the sentence changes underneath us (e.g. tab
  // switch), but not while the user is mid-edit on this field.
  useEffect(() => {
    if (document.activeElement !== taRef.current) setValue(sentence.source);
  }, [sentence.source]);

  // Auto-grow the textarea to fit its content.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);

  function commit() {
    if (value !== sentence.source) onEdit(value);
  }

  async function translate() {
    setTranslating(true);
    try {
      await onTranslate();
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="sentence-row">
      <div className="sentence-source">
        <button
          className="icon-btn sentence-delete"
          onClick={onDelete}
          title="Delete this sentence"
          aria-label="Delete this sentence"
        >
          ✕
        </button>
        <textarea
          ref={taRef}
          className="sentence-input"
          value={value}
          rows={1}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
        />
        <button
          className="icon-btn sentence-translate"
          onClick={translate}
          disabled={translating}
          title="Translate this sentence"
          aria-label="Translate this sentence"
        >
          {translating ? "…" : "⟳"}
        </button>
      </div>
      {sentence.translation && (
        <div className="sentence-translation">{sentence.translation}</div>
      )}
    </div>
  );
}
