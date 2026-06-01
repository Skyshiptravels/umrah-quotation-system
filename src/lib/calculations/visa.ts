import {
  DEFAULT_EXCHANGE_RATE,
  INFANT_VISA_RATE,
  PassengerCounts,
} from "@/types";
import { getVisaAdultsChildren } from "./hotel";

export interface VisaCostInput {
  adult_child_rate_sar: number;
  infant_rate_sar?: number;
  counts: PassengerCounts;
}

export interface VisaCostResult {
  adults_children_count: number;
  infants_count: number;
  adults_children_cost_sar: number;
  infants_cost_sar: number;
  total_cost_sar: number;
  total_cost_pkr: number;
  exchange_rate: number;
}

export function calculateVisaCost(
  input: VisaCostInput,
  exchangeRate = DEFAULT_EXCHANGE_RATE
): VisaCostResult {
  const adultsChildrenCount = getVisaAdultsChildren(input.counts);
  const infantsCount = input.counts.infants;
  const infantRate = input.infant_rate_sar ?? INFANT_VISA_RATE;

  const adultsChildrenCost =
    adultsChildrenCount * input.adult_child_rate_sar;
  const infantsCost = infantsCount * infantRate;
  const totalSar = adultsChildrenCost + infantsCost;
  const totalPkr = totalSar * exchangeRate;

  return {
    adults_children_count: adultsChildrenCount,
    infants_count: infantsCount,
    adults_children_cost_sar: Math.round(adultsChildrenCost * 100) / 100,
    infants_cost_sar: Math.round(infantsCost * 100) / 100,
    total_cost_sar: Math.round(totalSar * 100) / 100,
    total_cost_pkr: Math.round(totalPkr * 100) / 100,
    exchange_rate: exchangeRate,
  };
}

export function calculateVisaFromCounts(
  numAdultsChildren: number,
  numInfants: number,
  adultChildRate: number,
  infantRate = INFANT_VISA_RATE,
  exchangeRate = DEFAULT_EXCHANGE_RATE
): VisaCostResult {
  return calculateVisaCost(
    {
      adult_child_rate_sar: adultChildRate,
      infant_rate_sar: infantRate,
      counts: {
        adults: numAdultsChildren,
        children_with_bed: 0,
        children_without_bed: 0,
        infants: numInfants,
      },
    },
    exchangeRate
  );
}
