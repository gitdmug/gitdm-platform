"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Ev = {
  id: string;
  title: string;
  country?: string;
  currency?: string;
  impact?: string;
  scheduledAt?: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  source?: string;
};

const DAY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 21, label: "21 days" },
  { value: 30, label: "30 days" },
];

const ASSET_FILTERS = [
  { value: "all", label: "All assets" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "JPY", label: "JPY" },
  { value: "AUD", label: "AUD" },
  { value: "CAD", label: "CAD" },
  { value: "CHF", label: "CHF" },
  { value: "NZD", label: "NZD" },
  { value: "CNY", label: "CNY" },
];

export function EconomicCalendarClient() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(true);
  const [analysing, setAnalysing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [days, setDays] = useState(14);
  const [asset, setAsset] = useState("all");
  const [search, setSearch] = useState("");
  const [impact, setImpact] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/market-insights/economic-calendar?days=${days}`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (!cancelled) {
          setEvents(j.events || []);
          setNotice(j.notice || "");
        }
      } catch {
        if (!cancelled) setNotice("Could not load calendar.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (asset !== "all") {
        const cur = (ev.currency || "").toUpperCase();
        const title = (ev.title || "").toUpperCase();
        if (cur !== asset && !title.includes(asset)) return false;
      }
      if (impact !== "all") {
        if (String(ev.impact || "").toUpperCase() !== impact.toUpperCase()) return false;
      }
      if (q) {
        const hay = `${ev.title || ""} ${ev.country || ""} ${ev.currency || ""} ${ev.impact || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, asset, search, impact]);

  async function analyseEvent(ev: Ev) {
    setAnalysing(ev.id);
    setAnalysis("");
    try {
      const fd = new FormData();
      fd.set("symbol", ev.currency || "USD");
      const r = await fetch("/api/market-insights/analyse", { method: "POST", body: fd });
      const j = await r.json();
      if (r.ok) {
        setAnalysis(
          `Event: ${ev.title}\nScheduled: ${ev.scheduledAt || "—"}\nImpact: ${ev.impact || "—"}\n\n${j.summary || ""}\n\n${j.analysis || ""}`
        );
      } else {
        setAnalysis(j.error || "Analysis unavailable. Sign in and ensure AI keys are configured.");
      }
    } catch {
      setAnalysis("Analysis request failed.");
    } finally {
      setAnalysing(null);
    }
  }

  return (
    <div className="stack">
      <div
        className="panel"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <label>
          Horizon
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Asset / currency
          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            {ASSET_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Impact
          <select value={impact} onChange={(e) => setImpact(e.target.value)}>
            <option value="all">All impact</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            placeholder="Event, country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {busy && <p className="muted">Loading calendar…</p>}
      {notice && <p className="muted">{notice}</p>}
      <p className="muted" style={{ fontSize: 13 }}>
        Showing {filtered.length} of {events.length} events ·{" "}
        <Link href="/research">Back to Insights</Link>
      </p>

      <div className="stack">
        {filtered.map((ev) => (
          <article key={ev.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <span className="chip">{ev.impact || "EVENT"}</span>
                {ev.currency ? <span className="chip" style={{ marginLeft: 6 }}>{ev.currency}</span> : null}
                <h3 style={{ margin: "6px 0" }}>{ev.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {ev.country || "—"} · {ev.currency || "—"} ·{" "}
                  {ev.scheduledAt ? new Date(ev.scheduledAt).toLocaleString() : "Time TBC"}
                </p>
                <p className="muted" style={{ fontSize: 13 }}>
                  Forecast: {ev.forecast || "—"} · Previous: {ev.previous || "—"} · Actual:{" "}
                  {ev.actual || "—"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                disabled={!!analysing}
                onClick={() => analyseEvent(ev)}
              >
                {analysing === ev.id ? "Analysing…" : "AI scenario context"}
              </button>
            </div>
          </article>
        ))}
        {!busy && !filtered.length ? (
          <p className="muted">No events match these filters. Widen the horizon or clear search.</p>
        ) : null}
      </div>
      {analysis && (
        <div className="card" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
          <h3>Scenario context</h3>
          <p>{analysis}</p>
        </div>
      )}
    </div>
  );
}
