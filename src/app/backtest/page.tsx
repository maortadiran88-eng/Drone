"use client";

import { useState } from "react";

export default function BacktestPage() {
  const [ticker, setTicker] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runBacktest() {
    if (!ticker || !startDate || !endDate) {
      alert("יש למלא טיקר, תאריך התחלה ותאריך סיום");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/backtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: ticker.toUpperCase(), startDate, endDate }),
    });
    const json = await res.json();
    if (json.error) setError(json.error);
    else setResult(json);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">בדיקה היסטורית (Backtest)</h1>
      <p className="text-sm text-gray-500">
        הבדיקה משתמשת רק בנתונים שהיו זמינים בפועל בכל יום מסחר (ללא Look-Ahead
        Bias), וכוללת החלקה (Slippage) ועמלה לכל טרייד.
      </p>

      <div className="card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="טיקר (למשל NVDA)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <button onClick={runBacktest} disabled={loading} className="btn-primary">
          {loading ? "מריץ בדיקה..." : "הרץ בדיקה"}
        </button>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      {result && (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>מספר טריידים: {result.numberOfTrades}</div>
            <div>אחוז הצלחה: {result.winRatePct}%</div>
            <div>רווח ממוצע: ${result.avgWin}</div>
            <div>הפסד ממוצע: ${result.avgLoss}</div>
            <div>Profit Factor: {result.profitFactor ?? "-"}</div>
            <div>תשואה כוללת: ${result.totalReturn}</div>
            <div>תשואת Buy & Hold: {result.buyHoldReturnPct}%</div>
          </div>
          <p className="text-xs text-gray-400">{result.disclaimer}</p>

          {result.trades.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>כניסה</th>
                  <th>יציאה</th>
                  <th>מחיר כניסה</th>
                  <th>מחיר יציאה</th>
                  <th>רווח/הפסד</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t: any, i: number) => (
                  <tr key={i}>
                    <td>{t.entryDate}</td>
                    <td>{t.exitDate}</td>
                    <td>${t.entryPrice.toFixed(2)}</td>
                    <td>${t.exitPrice.toFixed(2)}</td>
                    <td className={t.pnlDollar >= 0 ? "text-green-600" : "text-red-600"}>
                      ${t.pnlDollar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
