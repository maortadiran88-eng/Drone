"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/dashboard");
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshResult(null);
    const res = await fetch("/api/market/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setRefreshResult(json);
    setRefreshing(false);
    load();
  }

  if (loading) return <p className="text-gray-500">טוען...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">לוח בקרה</h1>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-primary">
          {refreshing ? "מרענן..." : "רענן נתוני שוק"}
        </button>
      </div>

      {refreshResult?.error && (
        <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
          {refreshResult.error}
        </div>
      )}

      {refreshResult?.changes && (
        <div className="card text-sm">
          <h3 className="font-bold mb-2">מה השתנה מאז הבדיקה הקודמת</h3>
          {refreshResult.changes.length === 0 ? (
            <p className="text-gray-500">אין עדיין מניות במעקב. סנכרן מדדים ובצע סריקה תחילה.</p>
          ) : (
            <ul className="space-y-1">
              {refreshResult.changes.map((c: any, i: number) => (
                <li key={i} className="text-gray-700">
                  <b>{c.ticker}</b>
                  {c.priceBefore !== null && c.priceBefore !== undefined && (
                    <> — מחיר: ${c.priceBefore} → ${c.priceAfter}</>
                  )}
                  {c.stopAfter !== undefined && <> | סטופ: ${c.stopBefore} → ${c.stopAfter}</>}
                  {c.status && (
                    <>
                      {" "}
                      | <StatusBadge status={c.status} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500">שווי תיק</p>
          <p className="text-lg font-bold">${data.portfolioValue.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">מזומן זמין</p>
          <p className="text-lg font-bold">${data.availableCash.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">פוזיציות פתוחות</p>
          <p className="text-lg font-bold">{data.openPositionsCount}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">רווח/הפסד כולל</p>
          <p className={`text-lg font-bold ${data.totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${data.totalPL.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">התראות היום</h2>
        {data.alerts.length === 0 ? (
          <p className="text-gray-500 text-sm">אין התראות חדשות. בצע רענון נתוני שוק.</p>
        ) : (
          <ul className="space-y-2">
            {data.alerts.map((a: any, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <b>{a.ticker}</b>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">הפוזיציות שלי</h2>
        {data.positions.length === 0 ? (
          <p className="text-gray-500 text-sm">
            עדיין לא הוזנו פוזיציות. עבור לעמוד "הפוזיציות שלי" כדי להוסיף.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>טיקר</th>
                <th>מניות</th>
                <th>מחיר כניסה</th>
                <th>מחיר נוכחי</th>
                <th>רווח/הפסד</th>
                <th>סטופ נוכחי</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-bold">{p.ticker}</td>
                  <td>{p.shares}</td>
                  <td>${p.entryPrice}</td>
                  <td>{p.currentPrice ? `$${p.currentPrice}` : "אין נתונים"}</td>
                  <td className={p.pnlDollar >= 0 ? "text-green-600" : "text-red-600"}>
                    {p.pnlDollar !== null ? `$${p.pnlDollar}` : "-"}
                  </td>
                  <td>${p.currentStop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
