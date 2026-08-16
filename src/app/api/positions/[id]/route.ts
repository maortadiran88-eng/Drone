import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const body = await req.json();

  const existing = await prisma.position.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "פוזיציה לא נמצאה" }, { status: 404 });
  }

  // אם סוגרים פוזיציה - יוצרים רשומת TradeHistory ומעדכנים סטטוס
  if (body.status === "CLOSED" && body.exitPrice) {
    const exitPrice = Number(body.exitPrice);
    const holdDays = Math.floor(
      (Date.now() - new Date(existing.entryDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const pnlDollar = (exitPrice - existing.entryPrice) * existing.shares;
    const pnlPct = ((exitPrice - existing.entryPrice) / existing.entryPrice) * 100;

    await prisma.tradeHistory.create({
      data: {
        ticker: existing.ticker,
        entryPrice: existing.entryPrice,
        exitPrice,
        shares: existing.shares,
        pnlDollar,
        pnlPct,
        entryDate: existing.entryDate,
        exitDate: new Date(),
        holdDays,
      },
    });

    const updated = await prisma.position.update({
      where: { id },
      data: { status: "CLOSED", exitPrice, closedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  // עדכון Stop ידני (המשתמש מאשר את ה-Stop המוצע)
  if (body.currentStop !== undefined && body.currentStop !== existing.currentStop) {
    await prisma.positionHistory.create({
      data: {
        positionId: id,
        field: "stop",
        oldValue: String(existing.currentStop),
        newValue: String(body.currentStop),
      },
    });
  }

  const updated = await prisma.position.update({
    where: { id },
    data: {
      currentStop: body.currentStop ?? undefined,
      notes: body.notes ?? undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  await prisma.positionHistory.deleteMany({ where: { positionId: id } });
  await prisma.position.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
