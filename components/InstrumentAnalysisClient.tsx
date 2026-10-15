"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Detail = {
  instrument?: Record<string, any>;
  candles?: { openTime?: string; open: number; high: number; low: number; close: number }[];
  notice?: string;
};

type PerfRun = {
  id: string;
  symbol: string;
  bias?: string;
  buyPercent: number;
  sellPercent: number;
  outcome?: string | null;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  timeframe?: string;
  createdAt: string;
  summary?: string;
};

const TIMEFRAMES = [
  { id: "scalp", label: "Scalping", desc: "Minutes–hours" },
  { id: "day", label: "Day trading", desc: "Hours–1 day" },
  { id: "swing", label: "Swing", desc: "Days–weeks" },
  { id: "position", label: "Position", desc: "Weeks–months" },
];

function fmtTime(t?: string) {
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit" });
}

function LineChart({
  candles,
}: {
  candles: { open: number; high: number; low: number; close: number; openTime?: string }[];
}) {
  const data = candles
    .slice(-72)
    .filter((c) => Number.isFinite(c.close) && c.close > 0)
    .map((c) => ({ t: c.openTime, v: c.close }));
  if (data.length < 2) return <p className="muted">Not enough price data for a chart.</p>;

  const w = 680;
  const h = 240;
  const padL = 8;
  const padR = 72;
  const padT = 16;
  const padB = 28;
  const values = data.map((d) => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => padL + (i / (data.length - 1)) * (w - padL - padR);
  const y = (v: number) => padT + ((max - v) / range) * (h - padT - padB);

  const last = data[data.length - 1].v;
  const first = data[0].v;
  const up = last >= first;
  const stroke = up ? "#22c55e" : "#ef4444";
  const fill = up ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)";

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(" ");
  const area =
    line +
    ` L${x(data.length - 1).toFixed(1)},${(h - padB).toFixed(1)} L${x(0).toFixed(1)},${(h - padB).toFixed(1)} Z`;

  // mid reference
  const mid = (min + max) / 2;

  return (
    <div style={{ overflowX: "auto", background: "#0b1220", borderRadius: 10, padding: 4 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: 680, display: "block" }}>
        <line x1={padL} x2={w - padR} y1={y(mid)} y2={y(mid)} stroke="#334155" strokeDasharray="4 4" />
        <path d={area} fill={fill} />
        <path d={line} fill="none" stroke={stroke} strokeWidth={2.2} />
        <circle cx={x(data.length - 1)} cy={y(last)} r={4} fill={stroke} />
        <rect x={w - padR + 6} y={y(last) - 10} width={60} height={18} rx={4} fill={up ? "#16a34a" : "#dc2626"} />
        <text x={w - padR + 36} y={y(last) + 3} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
          {last.toFixed(last > 100 ? 2 : 5)}
        </text>
        <text x={padL} y={h - 6} fill="#64748b" fontSize={10}>
          {fmtTime(data[0].t)}
        </text>
        <text x={w - padR - 4} y={h - 6} textAnchor="end" fill="#64748b" fontSize={10}>
          {fmtTime(data[data.length - 1].t)}
        </text>
      </svg>
    </div>
  );
}

function MiniBars({ runs }: { runs: PerfRun[] }) {
  const wins = runs.filter((r) => r.outcome === "WIN").length;
  const losses = runs.filter((r) => r.outcome === "LOSS").length;
  const pending = runs.filter((r) => !r.outcome || r.outcome === "PENDING").length;
  const neutral = runs.filter((r) => r.outcome === "NEUTRAL").length;
  const total = Math.max(1, wins + losses + pending + neutral);
  const items = [
    { label: "Wins", n: wins, color: "#22c55e" },
    { label: "Losses", n: losses, color: "#ef4444" },
    { label: "Pending", n: pending, color: "#94a3b8" },
    { label: "Neutral", n: neutral, color: "#64748b" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {items.map((it) => (
        <div key={it.label} className="panel" style={{ padding: 10 }}>
          <div className="muted" style={{ fontSize: 11 }}>
            {it.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: it.color }}>{it.n}</div>
          <div style={{ height: 6, background: "#e2e8f0", borderRadius: 4, marginTop: 6 }}>
            <div style={{ width: `${(it.n / total) * 100}%`, height: "100%", background: it.color, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InstrumentAnalysisClient({
  symbol,
  canAnalyse,
}: {
  symbol: string;
  canAnalyse: boolean;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [timeframe, setTimeframe] = useState("day");
  const [meta, setMeta] = useState<{
    buyPercent: number;
    sellPercent: number;
    timeframe: string;
    summary: string;
    entryPrice?: number | null;
    stopLoss?: number | null;
    takeProfit?: number | null;
    provider?: string;
  } | null>(null);
  const [analyseBusy, setAnalyseBusy] = useState(false);
  const [perf, setPerf] = useState<PerfRun[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const [r, pr] = await Promise.all([
          fetch(`/api/market-insights?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" }),
          fetch(`/api/market-insights/performance?period=month&limit=50`, { cache: "no-store" }),
        ]);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Instrument details unavailable");
        if (!cancelled) setDetail(j);
        if (pr.ok) {
          const pj = await pr.json();
          const personal = Array.isArray(pj.personal) ? pj.personal : [];
          if (!cancelled) {
            setPerf(
              personal.filter(
                (x: PerfRun) => String(x.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === symbol
              )
            );
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load instrument");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  async function runAnalysis() {
    if (!canAnalyse) return;
    setAnalyseBusy(true);
    setAnalysis("");
    setMeta(null);
    try {
      const fd = new FormData();
      fd.set("symbol", symbol);
      fd.set("timeframe", timeframe);
      const r = await fetch("/api/market-insights/analyse", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Analysis unavailable");
      setAnalysis(j.analysis || "");
      setMeta({
        buyPercent: Number(j.buyPercent) || 50,
        sellPercent: Number(j.sellPercent) || 50,
        timeframe: String(j.timeframe || timeframe),
        summary: String(j.summary || ""),
        entryPrice: j.entryPrice,
        stopLoss: j.stopLoss,
        takeProfit: j.takeProfit,
        provider: j.provider,
      });
      try {
        const pr = await fetch(`/api/market-insights/performance?period=month&limit=50`, { cache: "no-store" });
        if (pr.ok) {
          const pj = await pr.json();
          const personal = Array.isArray(pj.personal) ? pj.personal : [];
          setPerf(
            personal.filter(
              (x: PerfRun) => String(x.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === symbol
            )
          );
        }
      } catch {
        /* ignore */
      }
    } catch (e) {
      setAnalysis(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyseBusy(false);
    }
  }

  const price =
    detail?.instrument?.mid ??
    detail?.instrument?.last ??
    detail?.instrument?.price ??
    detail?.instrument?.close;
  const candles = detail?.candles || [];

  const winRate = useMemo(() => {
    const resolved = perf.filter((p) => p.outcome === "WIN" || p.outcome === "LOSS");
    if (!resolved.length) return null;
    return Math.round((resolved.filter((p) => p.outcome === "WIN").length / resolved.length) * 1000) / 10;
  }, [perf]);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="grid grid-2" style={{ alignItems: "start", gap: 24 }}>
        <div className="panel">
          <div className="eyebrow">Quote & line chart</div>
          <h2 style={{ marginTop: 4 }}>{symbol}</h2>
          {busy ? <p className="muted">Loading…</p> : null}
          {error ? <p className="muted">{error}</p> : null}
          {price != null ? (
            <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>{String(price)}</p>
          ) : null}
          {detail?.instrument?.timestamp || detail?.instrument?.lastQuoteAt ? (
            <p className="muted" style={{ margin: 0 }}>
              As of {new Date(detail.instrument.timestamp || detail.instrument.lastQuoteAt).toLocaleString()}
            </p>
          ) : null}
          <div style={{ marginTop: 16 }}>
            <LineChart candles={candles} />
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            Coloured line chart from recent closes. Green = net rise in window; red = net fall. Educational only.
          </p>
        </div>

        <div className="panel">
          <div className="eyebrow">AI scenario analysis</div>
          <h2 style={{ marginTop: 4 }}>Technical · Fundamental · Sentimental</h2>
          <p className="muted" style={{ marginBottom: 8 }}>
            Choose a trader horizon so levels and scenario weights match your style.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                className={timeframe === tf.id ? "btn btn-primary btn-sm" : "btn btn-outline-dark btn-sm"}
                onClick={() => setTimeframe(tf.id)}
              >
                {tf.label}
                <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                  {tf.desc}
                </span>
              </button>
            ))}
          </div>
          {canAnalyse ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={analyseBusy}
              onClick={() => void runAnalysis()}
            >
              {analyseBusy ? "Analysing…" : "Analyse this instrument"}
            </button>
          ) : (
            <p>
              <Link href="/auth/sign-in">Sign in</Link> to run AI analysis.
            </p>
          )}

          {meta ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginTop: 16,
              }}
            >
              <div className="panel" style={{ padding: 12 }}>
                <div className="eyebrow">Buy-side</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}>{meta.buyPercent}%</div>
              </div>
              <div className="panel" style={{ padding: 12 }}>
                <div className="eyebrow">Sell-side</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>{meta.sellPercent}%</div>
              </div>
              <div className="panel" style={{ padding: 12 }}>
                <div className="eyebrow">Horizon</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.timeframe}</div>
              </div>
            </div>
          ) : null}

          {meta && (meta.entryPrice != null || meta.stopLoss != null) ? (
            <div style={{ marginTop: 12, fontSize: 14 }}>
              <strong>Educational levels</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {meta.entryPrice != null ? <li>Entry reference: {meta.entryPrice}</li> : null}
                {meta.stopLoss != null ? <li>Stop-loss study: {meta.stopLoss}</li> : null}
                {meta.takeProfit != null ? <li>Take-profit study: {meta.takeProfit}</li> : null}
              </ul>
              <p className="muted" style={{ fontSize: 12 }}>
                Outcomes stay PENDING until the market has had time to move and price reaches SL or TP (no
                instant wins). Provider: {meta.provider || "—"}.
              </p>
            </div>
          ) : null}

          {analysis ? (
            <pre
              style={{
                marginTop: 16,
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.5,
                maxHeight: 420,
                overflow: "auto",
              }}
            >
              {analysis}
            </pre>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="eyebrow">Performance metrics · {symbol}</div>
        <h2 style={{ marginTop: 4 }}>
          Journal snapshot
          {winRate != null ? (
            <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 12 }}>Win rate {winRate}%</span>
          ) : null}
        </h2>
        <MiniBars runs={perf} />
        {!perf.length ? (
          <p className="muted" style={{ marginTop: 12 }}>
            No analyses for this symbol yet.
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Horizon</th>
                  <th>Buy / Sell</th>
                  <th>Entry / SL / TP</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {perf.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.timeframe || "—"}</td>
                    <td>
                      <span style={{ color: "#16a34a" }}>{r.buyPercent}%</span> /{" "}
                      <span style={{ color: "#dc2626" }}>{r.sellPercent}%</span>
                    </td>
                    <td>
                      {r.entryPrice ?? "—"} / {r.stopLoss ?? "—"} / {r.takeProfit ?? "—"}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          r.outcome === "WIN" ? "#16a34a" : r.outcome === "LOSS" ? "#dc2626" : "#64748b",
                      }}
                    >
                      {r.outcome || "PENDING"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ marginTop: 12 }}>
          <Link className="btn btn-outline-dark btn-sm" href="/research/journal">
            Performance journal
          </Link>{" "}
          <Link className="btn btn-outline-dark btn-sm" href="/research/journal/full">
            Full report & export
          </Link>
        </p>
      </div>
    </div>
  );
}
