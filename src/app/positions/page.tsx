"use client";

import { useEffect, useState } from "react";

export default function PositionsPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [form, setForm] = useState({
    ticker: "",
    shares: "",
    entryPrice: "",
    entryDate: "",
    initialStop: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/positions");
    const json = await res.json();
    setPositions(json.positions);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addPosition() {
    if (!form.ticker || !form.shares || !form.entryPrice || !form.entryDate || !form.initialStop) {
      alert("יש למלא את כל שדות החובה");
      return;
    }
    await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ticker: "", shares: "", entryPrice: "", entryDate: "", initialStop: "", notes: "" });
    load();
  }

  async function closePosition(id: number) {
    const exitPrice = prompt("מחיר יציאה:");
    if (!exitPrice) return;
    await fetch(`/api/positions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED", exitPrice: Number(exitPrice) }),
    });
    load();
  }

  async function deletePosition(id: number) {
    if (!confirm("למחוק פוזיציה זו?")) return;
    await fetch(`/api/positions/${id}`, { method: "DELETE" });
    load();
  }

  const open = positions.filter((p) => p.status === "OPEN");
  const closed = positions.filter((p) => p.status === "CLOSED");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">הפוזיציות שלי</h1>

      <div className="card space-y-3">
        <h2 className="font-bold">הוספת פוזיציה חדשה</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input
            placeholder="טיקר (למשל NVDA)"
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="מספר מניות"
            type="number"
            value={form.shares}
            onChange={(e) => setForm({ ...form, shares: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="מחיר כניסה"
            type="number"
            value={form.entryPrice}
            onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="תאריך כניסה"
            type="date"
            value={form.entryDate}
            onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="סטופ התחלתי"
            type="number"
            value={form.initialStop}
            onChange={(e) => setForm({ ...form, initialStop: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="הערות"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <button onClick={addPosition} className="btn-primary">
          הוסף פוזיציה
        </button>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">פוזיציות פתוחות</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">טוען...</p>
        ) : open.length === 0 ? (
          <p className="text-gray-500 text-sm">אין פוזיציות פתוחות.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>טיקר</th>
                <th>מניות</th>
                <th>כניסה</th>
                <th>נוכחי</th>
                <th>רווח/הפסד</th>
                <th>סטופ</th>
                <th>מרחק מ-MA150</th>
                <th>ימים</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {open.map((p) => (
                <tr key={p.id}>
                  <td className="font-bold">{p.ticker}</td>
                  <td>{p.shares}</td>
                  <td>${p.entryPrice}</td>
                  <td>{p.insufficientData ? "אין נתונים" : `$${p.currentPrice}`}</td>
                  <td className={p.pnlDollar >= 0 ? "text-green-600" : "text-red-600"}>
                    {p.insufficientData ? "-" : `$${p.pnlDollar} (${p.pnlPct}%)`}
                  </td>
                  <td>${p.currentStop}</td>
                  <td>
                    {p.insufficientData || p.distanceFromMA150 === null
                      ? "-"
                      : `${p.distanceFromMA150.toFixed(1)}%`}
                  </td>
                  <td>{p.daysHeld}</td>
                  <td className="flex gap-2">
                    <button onClick={() => closePosition(p.id)} className="text-xs text-red-600">
                      סגור
                    </button>
                    <button onClick={() => deletePosition(p.id)} className="text-xs text-gray-400">
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">פוזיציות סגורות</h2>
        {closed.length === 0 ? (
          <p className="text-gray-500 text-sm">אין עדיין פוזיציות סגורות.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>טיקר</th>
                <th>מניות</th>
                <th>כניסה</th>
                <th>יציאה</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((p) => (
                <tr key={p.id}>
                  <td className="font-bold">{p.ticker}</td>
                  <td>{p.shares}</td>
                  <td>${p.entryPrice}</td>
                  <td>${p.exitPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
