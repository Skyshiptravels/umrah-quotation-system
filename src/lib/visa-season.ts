export type VisaSeason = "SUMMER" | "WINTER";

/** Umrah peak months May–September use summer multiplier. */
export function getVisaSeasonFromDate(dateStr?: string | null): VisaSeason {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return "WINTER";
  const month = d.getUTCMonth() + 1;
  return month >= 5 && month <= 9 ? "SUMMER" : "WINTER";
}

export function applyVisaSeasonalMultiplier(
  baseRate: number,
  summerMultiplier: number,
  winterMultiplier: number,
  season: VisaSeason
): number {
  const mult = season === "SUMMER" ? summerMultiplier : winterMultiplier;
  return Math.round(baseRate * mult * 100) / 100;
}

export function getEffectiveVisaRates(
  adultRate: number,
  infantRate: number,
  summerMultiplier: number,
  winterMultiplier: number,
  referenceDate?: string | null
): {
  adult_child_rate_sar: number;
  infant_rate_sar: number;
  season: VisaSeason;
} {
  const season = getVisaSeasonFromDate(referenceDate);
  return {
    adult_child_rate_sar: applyVisaSeasonalMultiplier(
      adultRate,
      summerMultiplier,
      winterMultiplier,
      season
    ),
    infant_rate_sar: applyVisaSeasonalMultiplier(
      infantRate,
      summerMultiplier,
      winterMultiplier,
      season
    ),
    season,
  };
}
