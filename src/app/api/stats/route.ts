import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";


export const dynamic = "force-dynamic";
export async function GET() {
  const trades = await prisma.tradeHistory.findMany({
    orderBy: { exitDate: "asc" },
  });

  if (trades.length === 0) {
    return NextResponse.json({
      totalTrades: 0,
      message: "אין עדיין טריידים סגורים להצגת סטטיסטיקה.",
    });
  }

  const wins = trades.filter((t) => t.pnlDollar > 0);
  const losses = trades.filter((t) => t.pnlDollar <= 0);

  const winRate = (wins.length / trades.length) * 100;
  const avgWin =
    wins.length > 0
      ? wins.reduce((s, t) => s + t.pnlDollar, 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? losses.reduce((s, t) => s + t.pnlDollar, 0) / losses.length
      : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnlDollar, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlDollar, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  // Max Drawdown לפי עקומת הון מצטברת מהטריידים בפועל
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of trades) {
    equity += t.pnlDollar;
    if (equity > peak) peak = equity;
    const drawdown = peak - equity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const totalReturn = trades.reduce((s, t) => s + t.pnlDollar, 0);

  return NextResponse.json({
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: profitFactor !== null ? Math.round(profitFactor * 100) / 100 : null,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    disclaimer:
      "נתונים היסטוריים אלה אינם מבטיחים תשואה עתידית ואינם המלצה להשקעה.",
  });
}
