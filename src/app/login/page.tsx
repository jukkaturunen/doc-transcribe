"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login failed.");
      }
      // Full navigation so middleware re-evaluates with the new cookie.
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <strong>Doc Transcribe</strong>
        <p className="muted">Enter the password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          // eslint-disable-next-line jsx-a11y/no-autofocus
        />
        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? "Checking…" : "Enter"}
        </button>
        {error && <span className="status error">{error}</span>}
      </form>
    </div>
  );
}
