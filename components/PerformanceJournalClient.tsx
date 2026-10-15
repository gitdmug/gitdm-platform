"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Run = {
  id: string;
  symbol: string;
  bias?: string;
  buyPercent: number;
  sellPercent: number;
  timeframe?: string;
  summary?: string;
  provider?: string;
  outcome?: string;
  outcomeNote?: string;
  retrievedAt: string;
  createdAt: string;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

type Payload = {
  period: string;
  public: {
    totalRuns: number;
    pending: number;
    wins: number;
    losses: number;
    neutral: number;
    verifiedWinRatePercent: number | null;
  };
  personal: Run[];
  recent?: { symbol: string; bias?: string; outcome?: string; createdAt: string; provider?: string }[];
};

function OutcomeBar({ wins, losses, neutral, pending }: { wins: number; losses: number; neutral: number; pending: number }) {
  const total = wins + losses + neutral + pending || 1;
  const segments = [
    { n: wins, color: "#22c55e" },
    { n: losses, color: "#ef4444" },
    { n: neutral, color: "#94a3b8" },
    { n: pending, color: "#cbd5e1" },
  ];
  return (
    <div style={{ display: "flex", height: 14, borderRadius: 6, overflow: "hidden", background: "#e2e8f0" }}>
      {segments.map((s, i) =>
        s.n > 0 ? (
          <div key={i} style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
        ) : null
      )}
    </div>
  );
}

function TrendBars({ personal }: { personal: Run[] }) {
  // Last 8 chronological for a simple outcome trend (oldest → newest of the recent set)
  const slice = [...personal].slice(0, 12).reverse();
  if (!slice.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72, marginTop: 12 }}>
      {slice.map((r) => {
        const h =
          r.outcome === "WIN" ? 64 : r.outcome === "LOSS" ? 28 : r.outcome === "NEUTRAL" ? 40 : 16;
        const color =
          r.outcome === "WIN" ? "#22c55e" : r.outcome === "LOSS" ? "#ef4444" : r.outcome === "NEUTRAL" ? "#94a3b8" : "#cbd5e1";
        return (
          <div
            key={r.id}
            title={`${r.symbol} ${r.outcome || "PENDING"} · ${new Date(r.createdAt).toLocaleString()}`}
            style={{ flex: 1, height: h, background: color, borderRadius: 4, minWidth: 8 }}
          />
        );
      })}
    </div>
  );
}

export function PerformanceJournalClient({ previewLimit = 10 }: { previewLimit?: number }) {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function load(p = period) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/market-insights/performance?period=${encodeURIComponent(p)}&limit=${previewLimit + 5}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load");
      setData(j);
    } catch (e: any) {
      setError(e.message || "Could not load performance data");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(period);
  }, [period]);

  async function setOutcome(id: string, outcome: string) {
    const note = outcome === "PENDING" ? "" : prompt("Optional note on the outcome") || "";
    const r = await fetch("/api/market-insights/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, outcome, note }),
    });
    if (r.ok) load(period);
  }

  const pub = data?.public;
  const personal = (data?.personal || []).slice(0, previewLimit);

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Institutional track record</div>
          <h2>Public performance</h2>
          <p className="muted">
            Auto-resolve waits for the scenario horizon and a real SL/TP hit — analyses stay PENDING
            until the market has moved. Educational only.
          </p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
          <option value="day">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="quarter">This quarter</option>
          <option value="year">This year</option>
        </select>
      </div>

      {busy && <p className="muted">Loading…</p>}
      {error && <p className="muted">{error}</p>}

      {pub && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
            <div className="card">
              <small>Total analyses</small>
              <strong style={{ fontSize: 24 }}>{pub.totalRuns}</strong>
            </div>
            <div className="card">
              <small>Wins</small>
              <strong style={{ fontSize: 24, color: "#16a34a" }}>{pub.wins}</strong>
            </div>
            <div className="card">
              <small>Losses</small>
              <strong style={{ fontSize: 24, color: "#dc2626" }}>{pub.losses}</strong>
            </div>
            <div className="card">
              <small>Pending</small>
              <strong style={{ fontSize: 24 }}>{pub.pending}</strong>
            </div>
            <div className="card">
              <small>Win rate</small>
              <strong style={{ fontSize: 24 }}>
                {pub.verifiedWinRatePercent != null ? `${pub.verifiedWinRatePercent}%` : "—"}
              </strong>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <OutcomeBar wins={pub.wins} losses={pub.losses} neutral={pub.neutral} pending={pub.pending} />
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Recent logs (last {previewLimit})</h3>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Full history and CSV export on the report page.
            </p>
          </div>
          <Link className="btn btn-primary btn-sm" href="/research/journal/full">
            Full report & export
          </Link>
        </div>
        <TrendBars personal={data?.personal || []} />
        {!personal.length && !busy && <p className="muted">No personal runs in this period yet.</p>}
        <div className="stack" style={{ marginTop: 12 }}>
          {personal.map((h) => {
            const sym = String(h.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
            const outcomeColor =
              h.outcome === "WIN" ? "#16a34a" : h.outcome === "LOSS" ? "#dc2626" : "#64748b";
            return (
              <article key={h.id} className="card" style={{ background: "var(--surface-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <Link href={`/research/instrument/${encodeURIComponent(sym)}`}>
                      <strong>{h.symbol}</strong>
                    </Link>{" "}
                    · {h.timeframe || "—"} ·{" "}
                    <span style={{ color: "#16a34a" }}>{h.buyPercent}%</span> /{" "}
                    <span style={{ color: "#dc2626" }}>{h.sellPercent}%</span>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {new Date(h.createdAt).toLocaleString()}
                      {h.entryPrice != null ? ` · E ${h.entryPrice}` : ""}
                      {h.stopLoss != null ? ` · SL ${h.stopLoss}` : ""}
                      {h.takeProfit != null ? ` · TP ${h.takeProfit}` : ""}
                    </div>
                  </div>
                  <span className="chip" style={{ color: outcomeColor }}>
                    {h.outcome || "PENDING"}
                  </span>
                </div>
                <div className="actions" style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setOutcome(h.id, "WIN")}>
                    Mark win
                  </button>
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setOutcome(h.id, "LOSS")}>
                    Mark loss
                  </button>
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setOutcome(h.id, "NEUTRAL")}>
                    Neutral
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <p className="muted" style={{ marginTop: 16 }}>
        <Link href="/research">← Market Insights</Link> ·{" "}
        <Link href="/research/economic-calendar">Economic calendar</Link>
      </p>
    </div>
  );
}
