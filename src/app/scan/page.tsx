"use client";

import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";

export default function ScanPage() {
  const [indices, setIndices] = useState<string[]>(["SP500", "NASDAQ100"]);
  const [maxDistancePct, setMaxDistancePct] = useState(5);
  const [slopes, setSlopes] = useState<string[]>(["UP", "FLAT"]);
  const [minAvgVolume, setMinAvgVolume] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  function toggleIndex(idx: string) {
    setIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  function toggleSlope(s: string) {
    setSlopes((prev) => (prev.includes(s) ? prev.filter((i) => i !== s) : [...prev, s]));
  }

  async function syncIndices() {
    setSyncing(true);
    setError(null);
    const res = await fetch("/api/indices/constituents");
    const json = await res.json();
    if (json.error) setError(json.error);
    setSyncing(false);
  }

  async function runScan() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indices, maxDistancePct, slopes, minAvgVolume }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      setResults([]);
    } else {
      setResults(json.results);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">סריקת מניות לפי שיטת מיכו</h1>

      <div className="card space-y-4">
        <div>
          <p className="font-medium mb-2">מדדים לסריקה</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={indices.includes("SP500")}
                onChange={() => toggleIndex("SP500")}
              />
              S&P 500
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={indices.includes("NASDAQ100")}
                onChange={() => toggleIndex("NASDAQ100")}
              />
              Nasdaq-100
            </label>
          </div>
          <button onClick={syncIndices} disabled={syncing} className="btn-secondary text-xs mt-2">
            {syncing ? "מסנכרן..." : "סנכרן רשימת מדדים עדכנית"}
          </button>
        </div>

        <div>
          <p className="font-medium mb-2">מרחק מקסימלי מ-MA150 (%)</p>
          <input
            type="number"
            value={maxDistancePct}
            onChange={(e) => setMaxDistancePct(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-32"
          />
        </div>

        <div>
          <p className="font-medium mb-2">שיפוע MA150</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={slopes.includes("UP")} onChange={() => toggleSlope("UP")} />
              עולה
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={slopes.includes("FLAT")} onChange={() => toggleSlope("FLAT")} />
              ישר
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={slopes.includes("DOWN")} onChange={() => toggleSlope("DOWN")} />
              יורד
            </label>
          </div>
        </div>

        <div>
          <p className="font-medium mb-2">מחזור מסחר ממוצע מינימלי</p>
          <input
            type="number"
            value={minAvgVolume}
            onChange={(e) => setMinAvgVolume(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-40"
          />
        </div>

        <button onClick={runScan} disabled={loading} className="btn-primary">
          {loading ? "סורק..." : "סרוק מניות"}
        </button>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r.ticker} className="card">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <h3 className="font-bold text-lg">
                  {r.ticker} <span className="text-gray-400 text-sm">{r.companyName}</span>
                </h3>
                <StatusBadge status={r.insufficientData ? "NO_DATA" : r.status} />
              </div>

              {r.insufficientData ? (
                <p className="text-gray-500 text-sm">{r.reasonText}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-2">{r.reasonText}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>מרחק מהממוצע: {r.distancePct}%</div>
                    <div>ציון התאמה: {r.setupScore}/100</div>
                    {r.entry && (
                      <div>
                        מחיר כניסה: ${r.entry.low}-${r.entry.high}
                      </div>
                    )}
                    {r.stop && <div>סטופ: ${r.stop.price} ({r.stop.riskPct}%)</div>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
