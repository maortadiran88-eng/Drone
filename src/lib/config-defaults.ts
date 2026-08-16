import { MichuConfig } from "./trading-engine";

export const DEFAULT_CONFIG: MichuConfig = {
  closeDistancePct: 5,
  mediumDistancePct: 10,
  farDistancePct: 20,
  volumeMultiplierMin: 1.5,
  slopeLookbackDays: 20,
  slopeUpThreshold: 0.5,
  slopeDownThreshold: -0.5,
  entryBufferPct: 0.5,
  ma150StopBufferPct: 2.0,
  swingLowBufferPct: 1.0,
  atrMultiplier: 2.0,
  maxAcceptableRiskPct: 8.0,
  closeStrengthRatio: 0.6,
  lowerLowLookbackDays: 5,
  breakoutLookbackDays: 20,
  portfolioValue: 100000,
  maxRiskPerTradePct: 1.0,
  maxPositionSizePct: 20.0,
};

/** ממיר רשומת Config מה-DB (Prisma) לאובייקט MichuConfig */
export function dbConfigToMichuConfig(dbConfig: any): MichuConfig {
  return {
    closeDistancePct: dbConfig.closeDistancePct,
    mediumDistancePct: dbConfig.mediumDistancePct,
    farDistancePct: dbConfig.farDistancePct,
    volumeMultiplierMin: dbConfig.volumeMultiplierMin,
    slopeLookbackDays: dbConfig.slopeLookbackDays,
    slopeUpThreshold: dbConfig.slopeUpThreshold,
    slopeDownThreshold: dbConfig.slopeDownThreshold,
    entryBufferPct: dbConfig.entryBufferPct,
    ma150StopBufferPct: dbConfig.ma150StopBufferPct,
    swingLowBufferPct: dbConfig.swingLowBufferPct,
    atrMultiplier: dbConfig.atrMultiplier,
    maxAcceptableRiskPct: dbConfig.maxAcceptableRiskPct,
    closeStrengthRatio: dbConfig.closeStrengthRatio,
    lowerLowLookbackDays: dbConfig.lowerLowLookbackDays,
    breakoutLookbackDays: dbConfig.breakoutLookbackDays,
    portfolioValue: dbConfig.portfolioValue,
    maxRiskPerTradePct: dbConfig.maxRiskPerTradePct,
    maxPositionSizePct: dbConfig.maxPositionSizePct,
  };
}
