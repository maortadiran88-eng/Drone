import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";


export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

  const signals = await prisma.signal.findMany({
    where: ticker ? { ticker } : undefined,
    orderBy: { evaluatedAt: "desc" },
    take: 200,
  });

  const positionChanges = await prisma.positionHistory.findMany({
    orderBy: { changedAt: "desc" },
    take: 200,
    include: { position: true },
  });

  const trades = await prisma.tradeHistory.findMany({
    where: ticker ? { ticker } : undefined,
    orderBy: { exitDate: "desc" },
  });

  return NextResponse.json({ signals, positionChanges, trades });
}
