import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_CONFIG } from "@/lib/config-defaults";


export const dynamic = "force-dynamic";
export async function GET() {
  let config = await prisma.config.findUnique({ where: { id: 1 } });
  if (!config) {
    config = await prisma.config.create({
      data: { id: 1, ...DEFAULT_CONFIG },
    });
  }
  return NextResponse.json(config);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const config = await prisma.config.upsert({
    where: { id: 1 },
    update: body,
    create: { id: 1, ...DEFAULT_CONFIG, ...body },
  });
  return NextResponse.json(config);
}
