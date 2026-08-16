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
  HistoricalBar,
} from "@/lib/market-data-provider";
import { evaluateStock, calcTrailingStop } from "@/lib/trading-engine";


export const dynamic = "force-dynamic";
interface BacktestRequest {
  ticker: string;
  startDate: string;
  endDate: string;
  slippagePct?: number;
  commissionPerTrade?: number;
}

/**
 * Backtest פשוט: מהלך יום-אחר-יום על הנתונים ההיסטוריים,
 * ובכל יום מחשב אינדיקטורים רק מתוך הנתונים שהיו זמינים עד אותו יום (לא כולל היום עצמו
 * עבור אינדיקטורים שדורשים "קודם" כמו Recent High). אין קריאה ל-Bar עתידי בשום שלב.
 */
export async function POST(req: Request) {
  const body: BacktestRequest = await req.json();
  const { ticker, startDate, endDate } = body;
  const slippagePct = body.slippagePct ?? 0.1;
  const commissionPerTrade = body.commissionPerTrade ?? 1;

  if (!process.env.MARKET_DATA_API_KEY) {
    return NextResponse.json(
      { error: "לא הוגדר מפתח API לנתוני שוק - לא ניתן להריץ Backtest." },
      { status: 400 }
    );
  }

  const bars = await fetchDailyHistory(ticker, 600);
  if (!bars || bars.length < 200) {
    return NextResponse.json(
      { error: "אין מספיק נתונים היסטוריים עבור מניה זו." },
      { status: 400 }
    );
  }

  const dbConfig = (await prisma.config.findUnique({ where: { id: 1 } })) as any;
  const config = dbConfig ? dbConfigToMichuConfig(dbConfig) : DEFAULT_CONFIG;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  const trades: any[] = [];
  let openTrade: {
    entryPrice: number;
    entryDate: string;
    shares: number;
    stop: number;
  } | null = null;

  // מתחילים מאינדקס 150 לפחות כדי שיהיה MA150 תקף
  for (let i = 150; i < bars.length; i++) {
    const barDate = new Date(bars[i].date).getTime();
    if (barDate < start) continue;
    if (barDate > end) break;

    // *** מניעת Look-Ahead: היסטוריה עד ליום i בלבד (כולל), לא מעבר לו ***
    const historySoFar: HistoricalBar[] = bars.slice(0, i + 1);
    const today = bars[i];

    const { today: ma150, slopePct } = calcMA150Series(
      historySoFar,
      config.slopeLookbackDays
    );
    const avgVolume20d = calcAvgVolume(historySoFar, 20);
    const atr14 = calcATR14(historySoFar);
    const swingLow = calcSwingLow(historySoFar, 15);
    const madeLowerLow = detectLowerLow(historySoFar, config.lowerLowLookbackDays);
    const recentHigh = calcRecentHigh(historySoFar, config.breakoutLookbackDays);

    if (ma150 === null || slopePct === null) continue;

    if (openTrade) {
      // עדכון Trailing Stop יומי
      const trailing = calcTrailingStop(
        openTrade.stop,
        ma150,
        swingLow,
        atr14,
        today.close,
        config
      );
      openTrade.stop = trailing.newStop;

      // בדיקת יציאה: המחיר נגע/חצה את ה-Stop תוך כדי היום
      if (today.low <= openTrade.stop) {
        const exitPrice = openTrade.stop * (1 - slippagePct / 100);
        const pnlDollar =
          (exitPrice - openTrade.entryPrice) * openTrade.shares - commissionPerTrade;
        const pnlPct = ((exitPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100;
        trades.push({
          entryDate: openTrade.entryDate,
          exitDate: today.date,
          entryPrice: openTrade.entryPrice,
          exitPrice,
          shares: openTrade.shares,
          pnlDollar: Math.round(pnlDollar * 100) / 100,
          pnlPct: Math.round(pnlPct * 100) / 100,
        });
        openTrade = null;
      }
      continue;
    }

    // אין פוזיציה פתוחה - בדיקת כניסה
    const evalResult = evaluateStock(
      {
        ticker,
        price: today.close,
        ma150,
        ma150SlopePct: slopePct,
        volume: today.volume,
        avgVolume20d,
        atr14,
        swingLow,
        recentHigh,
        madeLowerLow,
        candleOpen: today.open,
        candleClose: today.close,
        candleHigh: today.high,
        candleLow: today.low,
        hasOpenPosition: false,
      },
      config
    );

    if (evalResult.status === "BUY_SETUP" && evalResult.entry && evalResult.stop) {
      const entryPrice = evalResult.entry.low * (1 + slippagePct / 100);
      const riskAmount = config.portfolioValue * (config.maxRiskPerTradePct / 100);
      const perShareRisk = entryPrice - evalResult.stop.price;
      const shares =
        perShareRisk > 0 ? Math.floor(riskAmount / perShareRisk) : 0;

      if (shares > 0) {
        openTrade = {
          entryPrice,
          entryDate: today.date,
          shares,
          stop: evalResult.stop.price,
        };
      }
    }
  }

  const wins = trades.filter((t) => t.pnlDollar > 0);
  const losses = trades.filter((t) => t.pnlDollar <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin =
    wins.length > 0 ? wins.reduce((s, t) => s + t.pnlDollar, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? losses.reduce((s, t) => s + t.pnlDollar, 0) / losses.length
      : 0;
  const grossProfit = wins.reduce((s, t) => s + t.pnlDollar, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlDollar, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  const totalReturn = trades.reduce((s, t) => s + t.pnlDollar, 0);

  // Buy & Hold להשוואה
  const startBar = bars.find((b) => new Date(b.date).getTime() >= start);
  const endBar = [...bars].reverse().find((b) => new Date(b.date).getTime() <= end);
  const buyHoldReturnPct =
    startBar && endBar
      ? ((endBar.close - startBar.close) / startBar.close) * 100
      : null;

  return NextResponse.json({
    ticker,
    startDate,
    endDate,
    numberOfTrades: trades.length,
    winRatePct: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: profitFactor !== null ? Math.round(profitFactor * 100) / 100 : null,
    totalReturn: Math.round(totalReturn * 100) / 100,
    buyHoldReturnPct:
      buyHoldReturnPct !== null ? Math.round(buyHoldReturnPct * 100) / 100 : null,
    trades,
    disclaimer:
      "תוצאות היסטוריות אלה אינן מבטיחות ביצועים עתידיים. הבדיקה מבוססת רק על נתונים שהיו זמינים בזמן אמת בכל יום (ללא Look-Ahead), אך אינה כוללת את כל תנאי השוק בפועל.",
  });
}
