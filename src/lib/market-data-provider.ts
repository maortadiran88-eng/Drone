/**
 * market-data-provider.ts
 * -------------------------
 * שכבת גישה יחידה לנתוני שוק אמיתיים.
 * ספק ברירת המחדל: Financial Modeling Prep (FMP) - יש להם endpoint לרשימת
 * מרכיבי S&P 500 ו-Nasdaq 100, מחירים היסטוריים ונפח מסחר.
 * נרשמים בחינם ב-https://site.financialmodelingprep.com/developer/docs
 *
 * חוק ברזל: אם ה-API לא מחזיר תשובה תקינה - הפונקציה מחזירה null / []
 * ולעולם לא בודה נתונים. הקורא (API routes) חייב לטפל במקרה הזה
 * ולהציג "אין נתונים מספיקים".
 */

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_STABLE = "https://financialmodelingprep.com/stable";

function getApiKey(): string | null {
  const key = process.env.MARKET_DATA_API_KEY;
  return key && key.length > 0 ? key : null;
}

export interface ConstituentRow {
  ticker: string;
  companyName: string;
  indexName: "SP500" | "NASDAQ100";
}

/** מביא את רשימת מרכיבי S&P 500 מה-API. מחזיר [] אם אין מפתח/שגיאה. */
export async function fetchSP500Constituents(): Promise<ConstituentRow[]> {
  const key = getApiKey();
  if (!key) return [];
  try {
    const res = await fetch(`${FMP_BASE}/sp500_constituent?apikey=${key}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
      ticker: row.symbol,
      companyName: row.name,
      indexName: "SP500" as const,
    }));
  } catch {
    return [];
  }
}

/** מביא את רשימת מרכיבי Nasdaq-100 מה-API. מחזיר [] אם אין מפתח/שגיאה. */
export async function fetchNasdaq100Constituents(): Promise<ConstituentRow[]> {
  const key = getApiKey();
  if (!key) return [];
  try {
    const res = await fetch(`${FMP_BASE}/nasdaq_constituent?apikey=${key}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
      ticker: row.symbol,
      companyName: row.name,
      indexName: "NASDAQ100" as const,
    }));
  } catch {
    return [];
  }
}

export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** מביא נרות יומיים היסטוריים לטיקר (עד ~1 שנה, מספיק ל-MA150 + ATR + Swing Low) */
export async function fetchDailyHistory(
  ticker: string,
  days = 260
): Promise<HistoricalBar[] | null> {
  const key = getApiKey();
  if (!key) return null;
  try {
    const res = await fetch(
      `${FMP_BASE}/historical-price-full/${ticker}?timeseries=${days}&apikey=${key}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.historical)) return null;
    // FMP מחזיר מהחדש לישן - הופכים לסדר כרונולוגי עולה
    const bars: HistoricalBar[] = data.historical
      .map((d: any) => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }))
      .reverse();
    return bars;
  } catch {
    return null;
  }
}

/** מביא מחיר עדכני (quote) לטיקר בודד */
export async function fetchQuote(
  ticker: string
): Promise<{ price: number; volume: number } | null> {
  const key = getApiKey();
  if (!key) return null;
  try {
    const res = await fetch(`${FMP_BASE}/quote/${ticker}?apikey=${key}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { price: data[0].price, volume: data[0].volume };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// חישובים טכניים נגזרים מנתונים היסטוריים בלבד (לא ממציאים כלום)
// ---------------------------------------------------------------------

export function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/** MA150 של היום, ושל X ימים קודם לצורך שיפוע */
export function calcMA150Series(
  bars: HistoricalBar[],
  lookbackDays: number
): { today: number | null; lookback: number | null; slopePct: number | null } {
  const closes = bars.map((b) => b.close);
  const today = calcSMA(closes, 150);
  if (today === null) return { today: null, lookback: null, slopePct: null };

  if (closes.length < 150 + lookbackDays) {
    return { today, lookback: null, slopePct: null };
  }
  const closesLookback = closes.slice(0, closes.length - lookbackDays);
  const lookback = calcSMA(closesLookback, 150);
  if (lookback === null || lookback === 0) {
    return { today, lookback: null, slopePct: null };
  }
  const slopePct = ((today - lookback) / lookback) * 100;
  return { today, lookback, slopePct };
}

export function calcAvgVolume(bars: HistoricalBar[], period = 20): number | null {
  if (bars.length < period) return null;
  const slice = bars.slice(-period).map((b) => b.volume);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** ATR14 - Average True Range */
export function calcATR14(bars: HistoricalBar[]): number | null {
  if (bars.length < 15) return null;
  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i];
    const prevClose = bars[i - 1].close;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose)
    );
    trueRanges.push(tr);
  }
  const last14 = trueRanges.slice(-14);
  if (last14.length < 14) return null;
  return last14.reduce((a, b) => a + b, 0) / 14;
}

/** Swing Low אחרון - המינימום ב-N הימים האחרונים (לא כולל היום) */
export function calcSwingLow(bars: HistoricalBar[], lookback = 15): number | null {
  if (bars.length < lookback + 1) return null;
  const slice = bars.slice(-(lookback + 1), -1);
  return Math.min(...slice.map((b) => b.low));
}

/** בדיקה אם נוצר Low נמוך יותר ב-N הימים האחרונים (מגמת Lower Lows) */
export function detectLowerLow(bars: HistoricalBar[], lookback = 5): boolean | null {
  if (bars.length < lookback + 1) return null;
  const recent = bars.slice(-lookback);
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].low < recent[i - 1].low) return true;
  }
  return false;
}

/** ה-High הגבוה ביותר ב-N הימים שלפני היום (לא כולל הנר הנוכחי) */
export function calcRecentHigh(bars: HistoricalBar[], lookback = 20): number | null {
  if (bars.length < lookback + 1) return null;
  const slice = bars.slice(-(lookback + 1), -1);
  return Math.max(...slice.map((b) => b.high));
}
