import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_CONFIG, dbConfigToMichuConfig } from "@/lib/config-defaults";
import { evaluateStock } from "@/lib/trading-engine";


export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();

  const snap = await prisma.stockSnapshot.findUnique({ where: { ticker } });
  if (!snap || snap.insufficientData) {
    return NextResponse.json({
      ticker,
      insufficientData: true,
      reasonText: "אין נתונים מספיקים עבור מניה זו. יש לבצע רענון נתוני שוק.",
    });
  }

  const dbConfig = (await prisma.config.findUnique({ where: { id: 1 } })) as any;
  const config = dbConfig ? dbConfigToMichuConfig(dbConfig) : DEFAULT_CONFIG;

  const openPos = await prisma.position.findFirst({
    where: { ticker, status: "OPEN" },
  });

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

  return NextResponse.json({
    ...evalResult,
    companyName: snap.companyName,
    lastUpdated: snap.lastUpdated,
  });
}
