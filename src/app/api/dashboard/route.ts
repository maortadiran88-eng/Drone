import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const dbConfig = await prisma.config.findUnique({ where: { id: 1 } });
  const portfolioValue = dbConfig?.portfolioValue ?? 100000;

  const openPositions = await prisma.position.findMany({
    where: { status: "OPEN" },
  });

  let totalPL = 0;
  let openRiskDollar = 0;
  let investedValue = 0;

  const positionsDetailed = await Promise.all(
    openPositions.map(async (p) => {
      const snap = await prisma.stockSnapshot.findUnique({
        where: { ticker: p.ticker },
      });
      const currentPrice = snap?.price ?? null;
      const pnlDollar =
        currentPrice !== null ? (currentPrice - p.entryPrice) * p.shares : null;
      const riskDollar = (p.entryPrice - p.currentStop) * p.shares; // סיכון פתוח לפי הסטופ הנוכחי

      if (pnlDollar !== null) totalPL += pnlDollar;
      if (riskDollar > 0) openRiskDollar += riskDollar;
      investedValue += p.entryPrice * p.shares;

      return { ...p, currentPrice, pnlDollar };
    })
  );

  const availableCash = portfolioValue - investedValue;

  // התראות היום - מבוססות על Signal-ים האחרונים לכל טיקר בפוזיציה/רשימת מעקב
  const recentSignals = await prisma.signal.findMany({
    orderBy: { evaluatedAt: "desc" },
    take: 50,
  });

  const alerts = recentSignals
    .filter((s) =>
      ["BUY_SETUP", "EXIT", "EXTENDED"].includes(s.status)
    )
    .slice(0, 10)
    .map((s) => ({
      ticker: s.ticker,
      status: s.status,
      evaluatedAt: s.evaluatedAt,
    }));

  return NextResponse.json({
    portfolioValue,
    availableCash: Math.round(availableCash * 100) / 100,
    openPositionsCount: openPositions.length,
    totalPL: Math.round(totalPL * 100) / 100,
    openRiskDollar: Math.round(openRiskDollar * 100) / 100,
    positions: positionsDetailed,
    alerts,
  });
}
