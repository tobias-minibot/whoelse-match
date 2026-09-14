"use client";

import { useState } from "react";

export function CopyConnect({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="copy-connect">
      <div className="copy-connect-head">
        <span>{label}</span>
        <button className="btn btn-ink btn-sm" type="button" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-block">{text}</pre>
    </div>
  );
}
