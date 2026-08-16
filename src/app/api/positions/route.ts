import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";


export const dynamic = "force-dynamic";
export async function GET() {
  const positions = await prisma.position.findMany({
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    positions.map(async (p) => {
      const snap = await prisma.stockSnapshot.findUnique({
        where: { ticker: p.ticker },
      });
      const daysHeld = Math.floor(
        (Date.now() - new Date(p.entryDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!snap || snap.insufficientData || snap.price === null) {
        return { ...p, insufficientData: true, daysHeld };
      }

      const pnlDollar = (snap.price - p.entryPrice) * p.shares;
      const pnlPct = ((snap.price - p.entryPrice) / p.entryPrice) * 100;
      const distanceFromStop = ((snap.price - p.currentStop) / snap.price) * 100;
      const distanceFromMA150 =
        snap.ma150 !== null ? ((snap.price - snap.ma150) / snap.ma150) * 100 : null;

      return {
        ...p,
        insufficientData: false,
        currentPrice: snap.price,
        pnlDollar: Math.round(pnlDollar * 100) / 100,
        pnlPct: Math.round(pnlPct * 100) / 100,
        ma150: snap.ma150,
        distanceFromMA150,
        distanceFromStop: Math.round(distanceFromStop * 100) / 100,
        daysHeld,
      };
    })
  );

  return NextResponse.json({ positions: enriched });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { ticker, shares, entryPrice, entryDate, initialStop, notes } = body;

  if (!ticker || !shares || !entryPrice || !entryDate || !initialStop) {
    return NextResponse.json(
      { error: "חסרים שדות חובה: ticker, shares, entryPrice, entryDate, initialStop" },
      { status: 400 }
    );
  }

  const position = await prisma.position.create({
    data: {
      ticker: ticker.toUpperCase(),
      shares: Number(shares),
      entryPrice: Number(entryPrice),
      entryDate: new Date(entryDate),
      initialStop: Number(initialStop),
      currentStop: Number(initialStop),
      notes: notes ?? null,
      status: "OPEN",
    },
  });

  return NextResponse.json(position);
}
