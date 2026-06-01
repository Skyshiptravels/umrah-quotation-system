import { DEFAULT_EXCHANGE_RATE, QuotationCostBreakdown } from "@/types";

export interface QuotationTotalsInput {
  hotel_cost_sar: number;
  transport_cost_sar: number;
  visa_cost_sar: number;
  transfers_cost_sar?: number;
  upgrades_cost_sar?: number;
  flights_cost_pkr?: number;
  discount_amount_sar?: number;
  exchange_rate?: number;
}

export function calculateQuotationTotals(
  input: QuotationTotalsInput
): Pick<
  QuotationCostBreakdown,
  | "subtotal_sar"
  | "discount_amount_sar"
  | "total_cost_sar"
  | "total_cost_pkr"
  | "currency_rate"
> {
  const transfers = input.transfers_cost_sar ?? 0;
  const upgrades = input.upgrades_cost_sar ?? 0;
  const subtotalSar =
    input.hotel_cost_sar +
    input.transport_cost_sar +
    input.visa_cost_sar +
    transfers +
    upgrades;

  const discount = input.discount_amount_sar ?? 0;
  const totalSar = subtotalSar - discount;
  const exchangeRate = input.exchange_rate ?? DEFAULT_EXCHANGE_RATE;
  const flightsPkr = input.flights_cost_pkr ?? 0;
  const visaPkr = input.visa_cost_sar * exchangeRate;
  const totalPkr = visaPkr + flightsPkr;

  return {
    subtotal_sar: Math.round(subtotalSar * 100) / 100,
    discount_amount_sar: Math.round(discount * 100) / 100,
    total_cost_sar: Math.round(totalSar * 100) / 100,
    total_cost_pkr: Math.round(totalPkr * 100) / 100,
    currency_rate: exchangeRate,
  };
}

export function calculateStaffMargin(
  totalCostSar: number,
  marginPercent: number
): number {
  return Math.round(totalCostSar * (marginPercent / 100) * 100) / 100;
}

export function calculateMaxDiscountRequest(
  staffMargin: number,
  requestPercent = 50
): number {
  return Math.round(staffMargin * (requestPercent / 100) * 100) / 100;
}

export function calculateManagerMaxDiscount(
  totalCostSar: number,
  maxPercent = 15
): number {
  return Math.round(totalCostSar * (maxPercent / 100) * 100) / 100;
}

export function calculateCommissionAfterDiscount(
  originalMargin: number,
  approvedDiscount: number
): number {
  return Math.round((originalMargin - approvedDiscount) * 100) / 100;
}
