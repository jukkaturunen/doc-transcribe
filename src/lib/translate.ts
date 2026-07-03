// Client-side helper for the batch translation route. Server holds the key.
export async function translateTexts(texts: string[]): Promise<string[]> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Translation failed.");
  return data.translations as string[];
}
