"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";

export default function HistoryPage() {
  const [history, setHistory] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/history").then((r) => r.json()).then(setHistory);
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">היסטוריה וסטטיסטיקות</h1>

      {stats && (
        <div className="card">
          <h2 className="font-bold mb-3">סטטיסטיקת טריידים</h2>
          {stats.totalTrades === 0 ? (
            <p className="text-gray-500 text-sm">{stats.message}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>סה"כ טריידים: {stats.totalTrades}</div>
                <div>אחוז הצלחה: {stats.winRatePct}%</div>
                <div>רווח ממוצע: ${stats.avgWin}</div>
                <div>הפסד ממוצע: ${stats.avgLoss}</div>
                <div>Profit Factor: {stats.profitFactor ?? "-"}</div>
                <div>Max Drawdown: ${stats.maxDrawdown}</div>
                <div>תשואה כוללת: ${stats.totalReturn}</div>
              </div>
              <p className="text-xs text-gray-400 mt-3">{stats.disclaimer}</p>
            </>
          )}
        </div>
      )}

      {history && (
        <>
          <div className="card">
            <h2 className="font-bold mb-3">Signal-ים אחרונים</h2>
            {history.signals.length === 0 ? (
              <p className="text-gray-500 text-sm">אין עדיין היסטוריית Signal-ים.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>טיקר</th>
                    <th>סטטוס</th>
                    <th>ציון</th>
                    <th>תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {history.signals.slice(0, 30).map((s: any) => (
                    <tr key={s.id}>
                      <td className="font-bold">{s.ticker}</td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td>{s.setupScore ?? "-"}</td>
                      <td>{new Date(s.evaluatedAt).toLocaleString("he-IL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2 className="font-bold mb-3">שינויי Stop</h2>
            {history.positionChanges.length === 0 ? (
              <p className="text-gray-500 text-sm">אין עדיין שינויי Stop.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>טיקר</th>
                    <th>שדה</th>
                    <th>מ-</th>
                    <th>ל-</th>
                    <th>תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {history.positionChanges.slice(0, 30).map((c: any) => (
                    <tr key={c.id}>
                      <td className="font-bold">{c.position?.ticker}</td>
                      <td>{c.field}</td>
                      <td>${c.oldValue}</td>
                      <td>${c.newValue}</td>
                      <td>{new Date(c.changedAt).toLocaleString("he-IL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
