/**
 * trading-engine.ts
 * -------------------
 * כל לוגיקת "שיטת מיכו" מרוכזת כאן ובלבד. שינוי כללי השיטה נעשה כאן בלבד,
 * ולא בשום מקום אחר באפליקציה (API routes / UI לא מכילים לוגיקת החלטה).
 *
 * חשוב: הפונקציות כאן לעולם לא ממציאות נתונים. אם קלט חסר/לא תקין,
 * הפלט הוא { insufficientData: true } ואין להציג אות מסחר.
 */

export type DistanceClass = "CLOSE" | "MEDIUM" | "FAR" | "EXTENDED" | "UNKNOWN";
export type SlopeClass = "UP" | "FLAT" | "DOWN" | "UNKNOWN";
export type Status =
  | "WAIT"
  | "BUY_SETUP"
  | "BUY_CONFIRMED"
  | "HOLD"
  | "EXIT"
  | "EXTENDED"
  | "NO_DATA";

export interface MichuConfig {
  closeDistancePct: number;
  mediumDistancePct: number;
  farDistancePct: number;
  volumeMultiplierMin: number;
  slopeLookbackDays: number;
  slopeUpThreshold: number;
  slopeDownThreshold: number;
  entryBufferPct: number;
  ma150StopBufferPct: number;
  swingLowBufferPct: number;
  atrMultiplier: number;
  maxAcceptableRiskPct: number;
  closeStrengthRatio: number;
  lowerLowLookbackDays: number;
  breakoutLookbackDays: number;
  portfolioValue: number;
  maxRiskPerTradePct: number;
  maxPositionSizePct: number;
}

export interface StockInput {
  ticker: string;
  price: number | null;
  ma150: number | null;
  ma150SlopePct: number | null; // % שינוי ב-MA150 מול X ימים קודם, מחושב מראש מהנתונים ההיסטוריים
  volume: number | null;
  avgVolume20d: number | null;
  atr14: number | null;
  swingLow: number | null;
  recentHigh: number | null; // High הגבוה ביותר ב-breakoutLookbackDays האחרונים (לפני היום)
  madeLowerLow: boolean | null; // האם נוצר Low נמוך יותר ב-lowerLowLookbackDays האחרונים
  candleOpen: number | null;
  candleClose: number | null;
  candleHigh: number | null;
  candleLow: number | null;
  hasOpenPosition: boolean;
  currentStop?: number | null; // אם יש פוזיציה פתוחה
}

export interface ConditionResult {
  name: string;
  pass: boolean;
  weight: number;
}

export interface EvaluationResult {
  ticker: string;
  insufficientData: boolean;
  missingFields?: string[];
  distanceClass: DistanceClass;
  distancePct: number | null;
  slopeClass: SlopeClass;
  conditions: ConditionResult[];
  setupScore: number | null;
  status: Status;
  entry: { low: number; high: number } | null;
  stop: { price: number; riskPct: number; warning: string | null } | null;
  positionSize: {
    shares: number;
    maxDollarPosition: number;
    warning: string | null;
  } | null;
  reasonText: string;
}

const REQUIRED_FIELDS: (keyof StockInput)[] = [
  "price",
  "ma150",
  "ma150SlopePct",
  "volume",
  "avgVolume20d",
];

function checkMissingFields(input: StockInput): string[] {
  const missing: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    if (input[f] === null || input[f] === undefined) missing.push(f);
  }
  return missing;
}

/** מרחק המחיר מ-MA150 באחוזים, וסיווגו */
export function classifyDistance(
  price: number,
  ma150: number,
  config: MichuConfig
): { distancePct: number; distanceClass: DistanceClass } {
  const distancePct = ((price - ma150) / ma150) * 100;
  const abs = Math.abs(distancePct);
  let distanceClass: DistanceClass;
  if (abs >= config.farDistancePct) distanceClass = "EXTENDED";
  else if (abs >= config.mediumDistancePct) distanceClass = "FAR";
  else if (abs >= config.closeDistancePct) distanceClass = "MEDIUM";
  else distanceClass = "CLOSE";
  return { distancePct, distanceClass };
}

/** סיווג שיפוע MA150 */
export function classifySlope(
  ma150SlopePct: number,
  config: MichuConfig
): SlopeClass {
  if (ma150SlopePct > config.slopeUpThreshold) return "UP";
  if (ma150SlopePct < config.slopeDownThreshold) return "DOWN";
  return "FLAT";
}

/** תנאי "הקונים נכנסים" - כל תנאי מדיד בנפרד, PASS/FAIL */
export function buyerStrengthConditions(
  input: StockInput,
  distanceClass: DistanceClass,
  config: MichuConfig
): ConditionResult[] {
  const conditions: ConditionResult[] = [];

  conditions.push({
    name: "המחיר נמצא באזור MA150 (קרוב או בינוני)",
    pass: distanceClass === "CLOSE" || distanceClass === "MEDIUM",
    weight: 2,
  });

  conditions.push({
    name: "אין יצירת Low נמוך יותר לאחרונה",
    pass: input.madeLowerLow === false,
    weight: 1,
  });

  const isGreenCandle =
    input.candleClose !== null &&
    input.candleOpen !== null &&
    input.candleClose! > input.candleOpen!;
  conditions.push({
    name: "נר יומי חיובי (סגירה מעל פתיחה)",
    pass: isGreenCandle,
    weight: 2,
  });

  let closeStrength: boolean | null = null;
  if (
    input.candleClose !== null &&
    input.candleHigh !== null &&
    input.candleLow !== null &&
    input.candleHigh! > input.candleLow!
  ) {
    const ratio =
      (input.candleClose! - input.candleLow!) /
      (input.candleHigh! - input.candleLow!);
    closeStrength = ratio >= config.closeStrengthRatio;
  }
  conditions.push({
    name: "סגירה קרובה לחלק העליון של הנר",
    pass: closeStrength === true,
    weight: 1,
  });

  const relVolumePass =
    input.volume !== null &&
    input.avgVolume20d !== null &&
    input.volume! > input.avgVolume20d! * config.volumeMultiplierMin;
  conditions.push({
    name: `מחזור מסחר מעל ${config.volumeMultiplierMin}x מהממוצע`,
    pass: relVolumePass,
    weight: 2,
  });

  const breakoutPass =
    input.candleClose !== null &&
    input.recentHigh !== null &&
    input.candleClose! > input.recentHigh!;
  conditions.push({
    name: "פריצת ה-High של הימים האחרונים",
    pass: breakoutPass,
    weight: 1,
  });

  return conditions;
}

/** ציון התאמה לכללי השיטה (0-100). זהו לא ניבוי הסתברות הצלחה. */
export function calcSetupScore(conditions: ConditionResult[]): number {
  const totalWeight = conditions.reduce((s, c) => s + c.weight, 0);
  const passWeight = conditions.reduce(
    (s, c) => s + (c.pass ? c.weight : 0),
    0
  );
  if (totalWeight === 0) return 0;
  return Math.round((passWeight / totalWeight) * 100);
}

/** מציע אזור מחיר כניסה, או null אם אין נתונים מספיקים */
export function suggestEntry(
  price: number,
  recentHigh: number | null,
  config: MichuConfig
): { low: number; high: number } | null {
  if (recentHigh === null) return null;
  const high = recentHigh * (1 + config.entryBufferPct / 100);
  const low = Math.min(price, high);
  return { low: Math.round(low * 100) / 100, high: Math.round(high * 100) / 100 };
}

/** חישוב Stop Loss מבין כמה מקורות, בוחר את ההגיוני ביותר (לא הכי צמוד) */
export function calculateStopLoss(
  entry: number,
  ma150: number | null,
  swingLow: number | null,
  atr: number | null,
  config: MichuConfig
): { price: number; riskPct: number; warning: string | null } | null {
  const candidates: number[] = [];

  if (ma150 !== null) candidates.push(ma150 * (1 - config.ma150StopBufferPct / 100));
  if (swingLow !== null) candidates.push(swingLow * (1 - config.swingLowBufferPct / 100));
  if (atr !== null) candidates.push(entry - atr * config.atrMultiplier);

  const validCandidates = candidates.filter((c) => c > 0 && c < entry);
  if (validCandidates.length === 0) return null;

  // בוחרים את הגבוה מבין המועמדים ההגיוניים (הכי קרוב מהצדדים ההגיוניים, לא צמוד מדי לרעש)
  const stopPrice = Math.max(...validCandidates);
  const riskPct = ((entry - stopPrice) / entry) * 100;
  const warning = riskPct > config.maxAcceptableRiskPct ? "RISK_TOO_LARGE" : null;

  return {
    price: Math.round(stopPrice * 100) / 100,
    riskPct: Math.round(riskPct * 100) / 100,
    warning,
  };
}

/** גודל פוזיציה לפי ניהול סיכונים */
export function calcPositionSize(
  entry: number,
  stop: number,
  config: MichuConfig
): { shares: number; maxDollarPosition: number; warning: string | null } {
  const riskAmount = config.portfolioValue * (config.maxRiskPerTradePct / 100);
  const perShareRisk = entry - stop;
  let shares = perShareRisk > 0 ? Math.floor(riskAmount / perShareRisk) : 0;

  const maxDollarPosition =
    config.portfolioValue * (config.maxPositionSizePct / 100);

  let warning: string | null = null;
  if (shares * entry > maxDollarPosition) {
    shares = Math.floor(maxDollarPosition / entry);
    warning = "הפוזיציה הוגבלה לפי Max Position Size";
  }

  return { shares, maxDollarPosition, warning };
}

/** Trailing Stop - לעולם לא מוריד את ה-Stop */
export function calcTrailingStop(
  currentStop: number,
  ma150: number | null,
  swingLow: number | null,
  atr: number | null,
  price: number,
  config: MichuConfig
): { newStop: number; action: "KEEP_STOP" | "MOVE_STOP_UP" | "EXIT_WARNING" } {
  const candidates: number[] = [currentStop];
  if (ma150 !== null) candidates.push(ma150 * (1 - config.ma150StopBufferPct / 100));
  if (swingLow !== null) candidates.push(swingLow * (1 - config.swingLowBufferPct / 100));
  if (atr !== null) candidates.push(price - atr * config.atrMultiplier);

  const validCandidates = candidates.filter((c) => c < price);
  const bestCandidate =
    validCandidates.length > 0 ? Math.max(...validCandidates) : currentStop;

  // אכיפת הכלל: New Stop >= Previous Stop
  const newStop = Math.max(currentStop, bestCandidate);
  const newStopRounded = Math.round(newStop * 100) / 100;

  let action: "KEEP_STOP" | "MOVE_STOP_UP" | "EXIT_WARNING" = "KEEP_STOP";
  if (newStopRounded > currentStop) action = "MOVE_STOP_UP";
  if (price <= currentStop) action = "EXIT_WARNING";

  return { newStop: newStopRounded, action };
}

/** קביעת סטטוס (5 סטטוסים + EXTENDED בלבד) */
function determineStatus(
  distanceClass: DistanceClass,
  slopeClass: SlopeClass,
  setupScore: number,
  hasOpenPosition: boolean,
  priceAtOrBelowStop: boolean
): Status {
  if (distanceClass === "EXTENDED") return "EXTENDED";

  if (hasOpenPosition) {
    if (priceAtOrBelowStop) return "EXIT";
    return "HOLD";
  }

  const goodZone = distanceClass === "CLOSE" || distanceClass === "MEDIUM";
  const goodSlope = slopeClass === "UP" || slopeClass === "FLAT";

  if (goodZone && goodSlope && setupScore >= 60) return "BUY_SETUP";
  return "WAIT";
}

/** הפונקציה הראשית: מקבלת נתוני מניה גולמיים ומחזירה הערכה מלאה */
export function evaluateStock(
  input: StockInput,
  config: MichuConfig
): EvaluationResult {
  const missingFields = checkMissingFields(input);

  if (missingFields.length > 0) {
    return {
      ticker: input.ticker,
      insufficientData: true,
      missingFields,
      distanceClass: "UNKNOWN",
      distancePct: null,
      slopeClass: "UNKNOWN",
      conditions: [],
      setupScore: null,
      status: "NO_DATA",
      entry: null,
      stop: null,
      positionSize: null,
      reasonText: "אין נתונים מספיקים עבור מניה זו.",
    };
  }

  const { distancePct, distanceClass } = classifyDistance(
    input.price!,
    input.ma150!,
    config
  );
  const slopeClass = classifySlope(input.ma150SlopePct!, config);
  const conditions = buyerStrengthConditions(input, distanceClass, config);
  const setupScore = calcSetupScore(conditions);

  const priceAtOrBelowStop =
    input.hasOpenPosition &&
    input.currentStop !== null &&
    input.currentStop !== undefined &&
    input.price! <= input.currentStop;

  const status = determineStatus(
    distanceClass,
    slopeClass,
    setupScore,
    input.hasOpenPosition,
    !!priceAtOrBelowStop
  );

  let entry: { low: number; high: number } | null = null;
  let stop: { price: number; riskPct: number; warning: string | null } | null =
    null;
  let positionSize: {
    shares: number;
    maxDollarPosition: number;
    warning: string | null;
  } | null = null;

  if (status === "BUY_SETUP") {
    entry = suggestEntry(input.price!, input.recentHigh, config);
    if (entry) {
      stop = calculateStopLoss(
        entry.low,
        input.ma150,
        input.swingLow,
        input.atr14,
        config
      );
      if (stop) {
        positionSize = calcPositionSize(entry.low, stop.price, config);
      }
    }
  }

  const reasonText = buildReasonText(
    input.ticker,
    status,
    distancePct,
    slopeClass,
    conditions,
    setupScore,
    entry,
    stop
  );

  return {
    ticker: input.ticker,
    insufficientData: false,
    distanceClass,
    distancePct: Math.round(distancePct * 100) / 100,
    slopeClass,
    conditions,
    setupScore,
    status,
    entry,
    stop,
    positionSize,
    reasonText,
  };
}

/** בונה טקסט הסבר בעברית מנתונים מובנים בלבד - לא ממציא כלום */
function buildReasonText(
  ticker: string,
  status: Status,
  distancePct: number,
  slopeClass: SlopeClass,
  conditions: ConditionResult[],
  setupScore: number,
  entry: { low: number; high: number } | null,
  stop: { price: number; riskPct: number; warning: string | null } | null
): string {
  const slopeText =
    slopeClass === "UP" ? "עולה" : slopeClass === "DOWN" ? "יורדת" : "שטוחה";
  const parts: string[] = [];

  parts.push(
    `${ticker}: מרחק ${distancePct > 0 ? "+" : ""}${distancePct.toFixed(
      1
    )}% מ-MA150, שהמגמה שלו ${slopeText}.`
  );

  const passedConditions = conditions.filter((c) => c.pass).map((c) => c.name);
  if (passedConditions.length > 0) {
    parts.push(`תנאים שעברו: ${passedConditions.join(", ")}.`);
  }

  parts.push(`ציון התאמה לשיטה: ${setupScore}/100 (לא הסתברות הצלחה).`);

  if (status === "BUY_SETUP" && entry && stop) {
    parts.push(
      `המניה עומדת בתנאים שהוגדרו לשיטה. אזור כניסה אפשרי: $${entry.low}-$${entry.high}. סטופ אפשרי: $${stop.price} (סיכון ${stop.riskPct}%).`
    );
    if (stop.warning === "RISK_TOO_LARGE") {
      parts.push("אזהרה: הסיכון גבוה מדי ביחס לכניסה.");
    }
  } else if (status === "EXTENDED") {
    parts.push("המניה רחוקה מדי מהממוצע הנע - אין להמליץ על רדיפה אחריה.");
  } else if (status === "WAIT") {
    parts.push("אין כרגע התאמה מספקת לכללי השיטה - ממתינים.");
  }

  return parts.join(" ");
}
