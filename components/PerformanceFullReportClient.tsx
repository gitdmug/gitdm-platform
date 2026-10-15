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
  createdAt: string;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  resolvedAt?: string | null;
};

export function PerformanceFullReportClient() {
  const [period, setPeriod] = useState("month");
  const [rows, setRows] = useState<Run[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [pub, setPub] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const r = await fetch(
          `/api/market-insights/performance?period=${encodeURIComponent(period)}&limit=500`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        if (!cancelled) {
          setRows(j.personal || []);
          setPub(j.public || null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Load failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  function exportCsv() {
    const header = [
      "createdAt",
      "symbol",
      "timeframe",
      "bias",
      "buyPercent",
      "sellPercent",
      "entryPrice",
      "stopLoss",
      "takeProfit",
      "outcome",
      "provider",
      "outcomeNote",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const vals = [
        r.createdAt,
        r.symbol,
        r.timeframe || "",
        r.bias || "",
        r.buyPercent,
        r.sellPercent,
        r.entryPrice ?? "",
        r.stopLoss ?? "",
        r.takeProfit ?? "",
        r.outcome || "PENDING",
        r.provider || "",
        (r.outcomeNote || "").replace(/"/g, '""'),
      ];
      lines.push(vals.map((v) => `"${String(v)}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitdm-performance-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn btn-outline-dark btn-sm" href="/research/journal">
          ← Journal summary
        </Link>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="quarter">This quarter</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
        </select>
        <button type="button" className="btn btn-primary btn-sm" onClick={exportCsv} disabled={!rows.length}>
          Export CSV
        </button>
      </div>

      {pub && (
        <p className="muted">
          Period totals — analyses: {pub.totalRuns}, wins: {pub.wins}, losses: {pub.losses}, pending:{" "}
          {pub.pending}, win rate: {pub.verifiedWinRatePercent != null ? `${pub.verifiedWinRatePercent}%` : "—"}
        </p>
      )}

      {busy && <p className="muted">Loading…</p>}
      {error && <p className="muted">{error}</p>}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>Symbol</th>
              <th>Horizon</th>
              <th>Buy/Sell</th>
              <th>Entry</th>
              <th>SL</th>
              <th>TP</th>
              <th>Outcome</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <Link href={`/research/instrument/${encodeURIComponent(r.symbol)}`}>{r.symbol}</Link>
                </td>
                <td>{r.timeframe || "—"}</td>
                <td>
                  {r.buyPercent}/{r.sellPercent}
                </td>
                <td>{r.entryPrice ?? "—"}</td>
                <td>{r.stopLoss ?? "—"}</td>
                <td>{r.takeProfit ?? "—"}</td>
                <td
                  style={{
                    fontWeight: 600,
                    color: r.outcome === "WIN" ? "#16a34a" : r.outcome === "LOSS" ? "#dc2626" : undefined,
                  }}
                >
                  {r.outcome || "PENDING"}
                </td>
                <td>{r.provider || "—"}</td>
              </tr>
            ))}
            {!busy && !rows.length ? (
              <tr>
                <td colSpan={9} className="muted">
                  No runs in this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
