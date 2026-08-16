import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_CONFIG, dbConfigToMichuConfig } from "@/lib/config-defaults";
import {
  fetchDailyHistory,
  calcMA150Series,
  calcAvgVolume,
  calcATR14,
  calcSwingLow,
  detectLowerLow,
  calcRecentHigh,
} from "@/lib/market-data-provider";
import { evaluateStock, calcTrailingStop } from "@/lib/trading-engine";


export const dynamic = "force-dynamic";
/**
 * רענון נתוני שוק:
 * 1. עובר על כל הטיקרים שרלוונטיים (Positions + Watchlist/IndexConstituents שנצפו)
 * 2. שולף נתונים היסטוריים אמיתיים
 * 3. מחשב MA150/ATR/Volume/Swing Low
 * 4. שומר Snapshot, מעדכן Signal, מעדכן Positions (Trailing Stop)
 * 5. מחזיר מה השתנה מאז הפעם הקודמת
 */
export async function POST(req: Request) {
  if (!process.env.MARKET_DATA_API_KEY) {
    return NextResponse.json(
      {
        error:
          "לא הוגדר מפתח API לנתוני שוק (MARKET_DATA_API_KEY). לא ניתן לרענן נתונים אמיתיים.",
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const tickers: string[] = body.tickers || (await getDefaultTickers());

  const dbConfig = (await prisma.config.findUnique({ where: { id: 1 } })) as any;
  const config = dbConfig ? dbConfigToMichuConfig(dbConfig) : DEFAULT_CONFIG;

  const changes: any[] = [];

  for (const ticker of tickers) {
    const prevSnapshot = await prisma.stockSnapshot.findUnique({
      where: { ticker },
    });

    const bars = await fetchDailyHistory(ticker);
    if (!bars || bars.length < 150) {
      await prisma.stockSnapshot.upsert({
        where: { ticker },
        update: { insufficientData: true, lastUpdated: new Date() },
        create: { ticker, insufficientData: true },
      });
      changes.push({ ticker, status: "אין נתונים מספיקים" });
      continue;
    }

    const last = bars[bars.length - 1];
    const { today: ma150, slopePct } = calcMA150Series(
      bars,
      config.slopeLookbackDays
    );
    const avgVolume20d = calcAvgVolume(bars, 20);
    const atr14 = calcATR14(bars);
    const swingLow = calcSwingLow(bars, 15);
    const madeLowerLow = detectLowerLow(bars, config.lowerLowLookbackDays);
    const recentHigh = calcRecentHigh(bars, config.breakoutLookbackDays);

    const insufficientData = ma150 === null || slopePct === null;

    const snapshot = await prisma.stockSnapshot.upsert({
      where: { ticker },
      update: {
        price: last.close,
        ma150: ma150 ?? undefined,
        ma150SlopePct: slopePct ?? undefined,
        volume: last.volume,
        avgVolume20d: avgVolume20d ?? undefined,
        atr14: atr14 ?? undefined,
        swingLow: swingLow ?? undefined,
        recentHigh: recentHigh ?? undefined,
        madeLowerLow: madeLowerLow ?? undefined,
        candleOpen: last.open,
        candleClose: last.close,
        candleHigh: last.high,
        candleLow: last.low,
        insufficientData,
        lastUpdated: new Date(),
      },
      create: {
        ticker,
        price: last.close,
        ma150: ma150 ?? undefined,
        ma150SlopePct: slopePct ?? undefined,
        volume: last.volume,
        avgVolume20d: avgVolume20d ?? undefined,
        atr14: atr14 ?? undefined,
        swingLow: swingLow ?? undefined,
        recentHigh: recentHigh ?? undefined,
        madeLowerLow: madeLowerLow ?? undefined,
        candleOpen: last.open,
        candleClose: last.close,
        candleHigh: last.high,
        candleLow: last.low,
        insufficientData,
      },
    });

    // בדיקה אם יש פוזיציה פתוחה על הטיקר הזה
    const openPosition = await prisma.position.findFirst({
      where: { ticker, status: "OPEN" },
    });

    if (!insufficientData) {
      const evalResult = evaluateStock(
        {
          ticker,
          price: snapshot.price,
          ma150: snapshot.ma150,
          ma150SlopePct: snapshot.ma150SlopePct,
          volume: snapshot.volume,
          avgVolume20d: snapshot.avgVolume20d,
          atr14: snapshot.atr14,
          swingLow: snapshot.swingLow,
          recentHigh: snapshot.recentHigh,
          madeLowerLow: snapshot.madeLowerLow,
          candleOpen: snapshot.candleOpen,
          candleClose: snapshot.candleClose,
          candleHigh: snapshot.candleHigh,
          candleLow: snapshot.candleLow,
          hasOpenPosition: !!openPosition,
          currentStop: openPosition?.currentStop,
        },
        config
      );

      await prisma.signal.create({
        data: {
          ticker,
          status: evalResult.status,
          distanceFromMA150Pct: evalResult.distancePct ?? undefined,
          setupScore: evalResult.setupScore ?? undefined,
          entryPriceLow: evalResult.entry?.low,
          entryPriceHigh: evalResult.entry?.high,
          suggestedStop: evalResult.stop?.price,
          reasonJson: JSON.stringify(evalResult),
        },
      });

      // עדכון Trailing Stop לפוזיציה פתוחה
      if (openPosition && snapshot.price !== null) {
        const trailing = calcTrailingStop(
          openPosition.currentStop,
          snapshot.ma150,
          snapshot.swingLow,
          snapshot.atr14,
          snapshot.price,
          config
        );

        if (trailing.newStop !== openPosition.currentStop) {
          await prisma.positionHistory.create({
            data: {
              positionId: openPosition.id,
              field: "stop",
              oldValue: String(openPosition.currentStop),
              newValue: String(trailing.newStop),
            },
          });
          await prisma.position.update({
            where: { id: openPosition.id },
            data: { currentStop: trailing.newStop },
          });
        }

        changes.push({
          ticker,
          priceBefore: prevSnapshot?.price ?? null,
          priceAfter: snapshot.price,
          ma150Before: prevSnapshot?.ma150 ?? null,
          ma150After: snapshot.ma150,
          stopBefore: openPosition.currentStop,
          stopAfter: trailing.newStop,
          action: trailing.action,
          status: evalResult.status,
        });
      } else {
        changes.push({
          ticker,
          priceBefore: prevSnapshot?.price ?? null,
          priceAfter: snapshot.price,
          ma150Before: prevSnapshot?.ma150 ?? null,
          ma150After: snapshot.ma150,
          status: evalResult.status,
        });
      }
    }
  }

  return NextResponse.json({ refreshedAt: new Date().toISOString(), changes });
}

async function getDefaultTickers(): Promise<string[]> {
  const positions = await prisma.position.findMany({
    where: { status: "OPEN" },
    select: { ticker: true },
  });
  const constituents = await prisma.indexConstituent.findMany({
    select: { ticker: true },
  });
  const set = new Set<string>();
  positions.forEach((p) => set.add(p.ticker));
  constituents.forEach((c) => set.add(c.ticker));
  return Array.from(set);
}
