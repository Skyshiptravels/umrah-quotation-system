import { getEffectiveVisaRates, VisaSeason } from "@/lib/visa-season";
import { toNumber } from "@/lib/db";

export interface VisaRateSource {
  adult_child_rate_sar: number | string;
  infant_rate_sar: number | string;
  summer_rate_multiplier?: number | string | null;
  winter_rate_multiplier?: number | string | null;
}

export function resolveVisaRatesForQuotation(
  visa: VisaRateSource,
  referenceDate?: string | null
): {
  adult_child_rate_sar: number;
  infant_rate_sar: number;
  season: VisaSeason;
} {
  return getEffectiveVisaRates(
    toNumber(visa.adult_child_rate_sar),
    toNumber(visa.infant_rate_sar),
    toNumber(visa.summer_rate_multiplier) || 1,
    toNumber(visa.winter_rate_multiplier) || 1,
    referenceDate
  );
}
