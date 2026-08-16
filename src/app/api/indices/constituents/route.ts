import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchSP500Constituents,
  fetchNasdaq100Constituents,
} from "@/lib/market-data-provider";


export const dynamic = "force-dynamic";
/** מסנכרן ומחזיר את רשימת מרכיבי המדדים. מקור: API אמיתי בלבד. */
export async function GET() {
  if (!process.env.MARKET_DATA_API_KEY) {
    return NextResponse.json(
      {
        error:
          "לא הוגדר מפתח API. לא ניתן לשלוף רשימת מדדים עדכנית - יש להגדיר MARKET_DATA_API_KEY.",
        constituents: [],
      },
      { status: 400 }
    );
  }

  const [sp500, nasdaq100] = await Promise.all([
    fetchSP500Constituents(),
    fetchNasdaq100Constituents(),
  ]);

  if (sp500.length === 0 && nasdaq100.length === 0) {
    return NextResponse.json(
      {
        error:
          "מקור הנתונים לא סיפק רשימת חברות עדכנית כרגע. נסה שוב מאוחר יותר.",
        constituents: [],
      },
      { status: 502 }
    );
  }

  const all = [...sp500, ...nasdaq100];

  // עדכון מסד הנתונים - מוחקים ישנים ומכניסים עדכני
  await prisma.$transaction([
    prisma.indexConstituent.deleteMany({}),
    prisma.indexConstituent.createMany({
      data: all.map((row) => ({
        ticker: row.ticker,
        indexName: row.indexName,
        companyName: row.companyName,
      })),
    }),
  ]);

  return NextResponse.json({ constituents: all, syncedAt: new Date().toISOString() });
}
