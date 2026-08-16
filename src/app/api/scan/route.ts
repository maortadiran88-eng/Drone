import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_CONFIG, dbConfigToMichuConfig } from "@/lib/config-defaults";
import { evaluateStock } from "@/lib/trading-engine";

interface ScanFilters {
  indices: ("SP500" | "NASDAQ100")[]; // מדדים לסריקה
  maxDistancePct?: number; // מרחק מקסימלי מ-MA150
  slopes?: ("UP" | "FLAT" | "DOWN")[]; // שיפועים מותרים
  minAvgVolume?: number; // מחזור ממוצע מינימלי
}

export async function POST(req: Request) {
  const filters: ScanFilters = await req.json();

  const dbConfig = (await prisma.config.findUnique({ where: { id: 1 } })) as any;
  const config = dbConfig ? dbConfigToMichuConfig(dbConfig) : DEFAULT_CONFIG;

  const indices = filters.indices?.length ? filters.indices : ["SP500", "NASDAQ100"];

  const constituents = await prisma.indexConstituent.findMany({
    where: { indexName: { in: indices } },
  });

  if (constituents.length === 0) {
    return NextResponse.json(
      {
        error:
          "אין רשימת מדדים מסונכרנת. יש לסנכרן קודם דרך /api/indices/constituents.",
        results: [],
      },
      { status: 400 }
    );
  }

  // הסרת כפילויות טיקרים שמופיעים בשני המדדים
  const uniqueTickers = Array.from(new Set(constituents.map((c) => c.ticker)));

  const snapshots = await prisma.stockSnapshot.findMany({
    where: { ticker: { in: uniqueTickers } },
  });
  const snapshotMap = new Map(snapshots.map((s) => [s.ticker, s]));

  const openPositions = await prisma.position.findMany({
    where: { status: "OPEN", ticker: { in: uniqueTickers } },
  });
  const openPositionMap = new Map(openPositions.map((p) => [p.ticker, p]));

  const results: any[] = [];

  for (const ticker of uniqueTickers) {
    const snap = snapshotMap.get(ticker);
    const constituentInfo = constituents.find((c) => c.ticker === ticker);

    if (!snap || snap.insufficientData) {
      results.push({
        ticker,
        companyName: constituentInfo?.companyName ?? null,
        insufficientData: true,
        reasonText: "אין נתונים מספיקים עבור מניה זו.",
      });
      continue;
    }

    if (
      filters.minAvgVolume &&
      (snap.avgVolume20d === null || snap.avgVolume20d < filters.minAvgVolume)
    ) {
      continue; // סינון נזילות נמוכה
    }

    const openPos = openPositionMap.get(ticker);
    const evalResult = evaluateStock(
      {
        ticker,
        price: snap.price,
        ma150: snap.ma150,
        ma150SlopePct: snap.ma150SlopePct,
        volume: snap.volume,
        avgVolume20d: snap.avgVolume20d,
        atr14: snap.atr14,
        swingLow: snap.swingLow,
        recentHigh: snap.recentHigh,
        madeLowerLow: snap.madeLowerLow,
        candleOpen: snap.candleOpen,
        candleClose: snap.candleClose,
        candleHigh: snap.candleHigh,
        candleLow: snap.candleLow,
        hasOpenPosition: !!openPos,
        currentStop: openPos?.currentStop,
      },
      config
    );

    if (
      filters.maxDistancePct !== undefined &&
      evalResult.distancePct !== null &&
      Math.abs(evalResult.distancePct) > filters.maxDistancePct
    ) {
      continue;
    }

    if (
      filters.slopes?.length &&
      evalResult.slopeClass !== "UNKNOWN" &&
      !filters.slopes.includes(evalResult.slopeClass as any)
    ) {
      continue;
    }

    results.push({
      ticker,
      companyName: constituentInfo?.companyName ?? null,
      index: constituentInfo?.indexName,
      ...evalResult,
      volume: snap.volume,
      avgVolume: snap.avgVolume20d,
      lastUpdated: snap.lastUpdated,
    });
  }

  // מיון: הכי מתאימות (setupScore גבוה) קודם
  results.sort((a, b) => (b.setupScore ?? -1) - (a.setupScore ?? -1));

  return NextResponse.json({ results, scannedAt: new Date().toISOString() });
}
