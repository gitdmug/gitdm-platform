"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fa", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#07144a", color: "#c9d4e4", padding: "12px 20px", fontSize: 13 }}>
        <Link href="/" style={{ color: "#fff", fontWeight: 600, textDecoration: "none" }}>
          GITDM
        </Link>
        <span style={{ margin: "0 12px", opacity: 0.5 }}>·</span>
        <Link href="/" style={{ color: "#c9d4e4", textDecoration: "none", marginRight: 12 }}>
          Home
        </Link>
        <Link href="/contact" style={{ color: "#c9d4e4", textDecoration: "none" }}>
          Contact
        </Link>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto",
            borderRadius: "50%",
            background: "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          ⚠
        </div>
        <p style={{ marginTop: 24, fontSize: 13, fontWeight: 600, color: "#0f766e", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Temporary interruption
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 28, color: "#0f172a" }}>
          We could not load this page
        </h1>
        <p style={{ marginTop: 16, color: "#475569", lineHeight: 1.6 }}>
          This is usually a brief system issue or a missing database update after a deploy.
          Please try again. If it continues, use the links below or contact support.
        </p>
        {error.digest && (
          <p
            style={{
              marginTop: 12,
              display: "inline-block",
              background: "#e2e8f0",
              padding: "6px 12px",
              borderRadius: 8,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Ref: {error.digest}
          </p>
        )}
        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 8,
              padding: "10px 18px",
              color: "#334155",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 8,
              padding: "10px 18px",
              color: "#334155",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/contact"
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 8,
              padding: "10px 18px",
              color: "#334155",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Contact support
          </Link>
        </div>
        <p style={{ marginTop: 28, fontSize: 12, color: "#94a3b8" }}>
          support@globalinstituteoftrading.com · WhatsApp 0790103115
        </p>
      </div>
    </div>
  );
}
