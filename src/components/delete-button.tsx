"use client";

import { useState } from "react";

// Two-step delete: the first click asks, the second click deletes
export default function DeleteButton({
  label,
  onDelete,
  variant = "link",
  className = "",
}: {
  label: string;
  onDelete: () => Promise<void>;
  variant?: "link" | "button";
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`${variant === "button" ? "btn btn-danger-outline" : "text-sm font-semibold text-muted hover:text-chilli"} ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={`rise inline-flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <span className="font-semibold text-chilli">{error || "Delete for good?"}</span>
      <button
        type="button"
        disabled={busy}
        autoFocus
        onClick={async () => {
          setBusy(true);
          try {
            await onDelete();
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
        className="btn btn-danger btn-sm"
      >
        {busy ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="btn btn-quiet btn-sm">
        Keep
      </button>
    </span>
  );
}
