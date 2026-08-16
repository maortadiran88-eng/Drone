"use client";

import { useEffect, useState } from "react";

const FIELDS: { key: string; label: string }[] = [
  { key: "portfolioValue", label: "שווי תיק ($)" },
  { key: "maxRiskPerTradePct", label: "סיכון מקסימלי לטרייד (%)" },
  { key: "maxPositionSizePct", label: "גודל פוזיציה מקסימלי (% מהתיק)" },
  { key: "closeDistancePct", label: "מרחק \"קרוב\" מ-MA150 (%)" },
  { key: "mediumDistancePct", label: "מרחק \"בינוני\" מ-MA150 (%)" },
  { key: "farDistancePct", label: "מרחק \"רחוק / אל תרדוף\" מ-MA150 (%)" },
  { key: "volumeMultiplierMin", label: "מכפיל מחזור מינימלי" },
  { key: "slopeLookbackDays", label: "ימים אחורה לחישוב שיפוע MA150" },
  { key: "entryBufferPct", label: "מרווח מעל High לכניסה (%)" },
  { key: "ma150StopBufferPct", label: "מרווח סטופ מתחת ל-MA150 (%)" },
  { key: "swingLowBufferPct", label: "מרווח סטופ מתחת ל-Swing Low (%)" },
  { key: "atrMultiplier", label: "מכפיל ATR לסטופ" },
  { key: "maxAcceptableRiskPct", label: "סיכון מקסימלי סביר לכניסה (%)" },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig);
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setConfig(await res.json());
    setSaving(false);
  }

  if (!config) return <p className="text-gray-500">טוען...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">הגדרות שיטת מיכו</h1>
      <p className="text-sm text-gray-500">
        כל הפרמטרים כאן משפיעים ישירות על מנוע הלוגיקה (trading-engine.ts) - ניתן
        לשנות אותם כאן בלי לגעת בקוד.
      </p>

      <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-sm text-gray-600">{f.label}</label>
            <input
              type="number"
              value={config[f.key] ?? ""}
              onChange={(e) => setConfig({ ...config, [f.key]: Number(e.target.value) })}
              className="border rounded-lg px-3 py-2 w-full mt-1"
            />
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? "שומר..." : "שמור הגדרות"}
      </button>
    </div>
  );
}
