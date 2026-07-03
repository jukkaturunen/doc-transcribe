// Deterministic sentence splitting, shared by the server OCR route and any
// client code that needs to re-derive sentences from a legacy text blob.
// Pure — no secrets, safe to import anywhere.
//
// Rules: collapse whitespace/line breaks, then break after sentence-ending
// punctuation (. ! ?) — but never inside the [ ] / { } markers the OCR prompt
// uses (e.g. "[illegible?]"), and only when the next sentence plausibly starts
// (uppercase/quote/opening bracket/digit), so decimals ("3.5") and abbreviations
// followed by lowercase ("e.g. the") stay intact.
const TRAILING = /[.!?"'”’)\]]/; // terminals + closing quotes/brackets
const SENTENCE_START = /[A-Z0-9"'“‘([{]/;

export function splitIntoSentences(text: string): string[] {
  const s = text.replace(/\s+/g, " ").trim();
  const sentences: string[] = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    buf += ch;
    if (ch === "[" || ch === "{") {
      depth++;
    } else if (ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && (ch === "." || ch === "!" || ch === "?")) {
      // Absorb any run of trailing terminals / closing quotes (e.g. ?!, ..., .")
      let j = i + 1;
      while (j < s.length && TRAILING.test(s[j])) {
        buf += s[j];
        j++;
      }
      // Skip spaces to find where the next sentence would begin.
      let k = j;
      while (k < s.length && s[k] === " ") k++;
      // A decimal like "3.5" has no space, so k stays on the next digit —
      // exclude that case explicitly.
      const isDecimal =
        ch === "." && /\d/.test(s[i - 1] ?? "") && /\d/.test(s[k] ?? "");
      const startsNew =
        !isDecimal && (k >= s.length || SENTENCE_START.test(s[k]));
      if (startsNew) {
        sentences.push(buf.trim());
        buf = "";
        i = k - 1; // resume at the next sentence's first char
      } else {
        i = j - 1; // mid-sentence punctuation; keep going
      }
    }
  }
  if (buf.trim()) sentences.push(buf.trim());
  return sentences;
}
