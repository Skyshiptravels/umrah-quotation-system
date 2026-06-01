import { calculateVisaCost } from "@/lib/calculations/visa";
import { calculateSharingStayCost } from "@/lib/calculations/hotel";
import { DEFAULT_EXCHANGE_RATE } from "@/types";
import { HotelBlock, QuotationFormState, SuggestedUpgrades } from "@/types/quotation-form";

export function totalPassengers(form: Pick<QuotationFormState, "adults" | "childrenWithBed" | "childrenWithoutBed" | "infants">): number {
  return form.adults + form.childrenWithBed + form.childrenWithoutBed + form.infants;
}

export function totalAirTicketsPkr(form: QuotationFormState): number {
  return (
    form.adults * form.airTicketAdultPkr +
    (form.childrenWithBed + form.childrenWithoutBed) * form.airTicketChildPkr +
    form.infants * form.airTicketInfantPkr
  );
}

export function getExpiryDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d;
}

export function formatDisplayDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso + "T00:00:00") : iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function tripDuration(hotels: HotelBlock[]): { days: number; nights: number } {
  if (hotels.length === 0 || !hotels[0].checkIn) return { days: 0, nights: 0 };
  const nights = hotels.reduce((s, h) => s + h.nights, 0);
  const firstCheckIn = hotels[0].checkIn;
  const lastHotel = hotels[hotels.length - 1];
  const lastCheckout = addDays(lastHotel.checkIn, lastHotel.nights);
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(lastCheckout).getTime() - new Date(firstCheckIn + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  return { days, nights };
}

export function calculateUpgradesCost(
  form: QuotationFormState,
  upgrades: SuggestedUpgrades
): number {
  let total = 0;
  const pax = totalPassengers(form);

  form.hotels.forEach((h) => {
    const upgradePerNight =
      h.city === "Makkah" ? upgrades.roomUpgradeMakkah : upgrades.roomUpgradeMadinah;
    const roomCount = h.rooms.reduce((s, r) => s + r.quantity, 0);
    total += upgradePerNight * h.nights * roomCount;
    if (upgrades.mealPlan !== "RO") {
      total += upgrades.mealPlanPremium * h.nights * roomCount;
    }
  });

  if (upgrades.umrahTraining) total += 500;
  if (upgrades.meetGreet) total += 300;
  if (upgrades.medicalInsurance) total += 200 * pax;
  if (upgrades.emergencyEvacuation) total += 100 * pax;

  return Math.round(total * 100) / 100;
}

export interface FormCostPreview {
  hotelCostSar: number;
  transportCostSar: number;
  visaCostSar: number;
  visaCostPkr: number;
  upgradesCostSar: number;
  subtotalSar: number;
  airTicketsPkr: number;
  grandTotalSar: number;
  grandTotalPkr: number;
  hotelBreakdown: Array<{ label: string; cost: number }>;
  transportBreakdown: Array<{ label: string; cost: number }>;
}

export function previewQuotationCosts(
  form: QuotationFormState,
  visaRate: number,
  infantVisaRate = 490
): FormCostPreview {
  const hotelBreakdown: Array<{ label: string; cost: number }> = [];
  let hotelCostSar = 0;
  const bedsWithSharing =
    form.adults + form.childrenWithBed;

  form.hotels.forEach((h) => {
    if (h.bookingMode === "SHARING" && h.sharingRatePerBed > 0) {
      const viewMod = h.viewModifier;
      const cost = calculateSharingStayCost({
        rate_per_bed_sar: h.sharingRatePerBed,
        pax_with_bed: bedsWithSharing,
        nights: h.nights,
        view_modifier: viewMod,
        city: h.city,
      });
      hotelCostSar += cost;
      hotelBreakdown.push({
        label: `${h.city} Sharing (${bedsWithSharing} pax × ${h.sharingRatePerBed} SAR/bed × ${h.nights}n)`,
        cost: Math.round(cost * 100) / 100,
      });
      return;
    }

    h.rooms.forEach((r) => {
      if (!r.ratePerNight) return;
      const viewMod = h.viewModifier;
      const viewSar = h.city === "Makkah" ? (viewMod === "HARAM_VIEW" ? 200 : viewMod === "KABA_VIEW" ? 400 : 0) : 0;
      const nightly = r.ratePerNight + viewSar;
      const cost = nightly * h.nights * r.quantity;
      hotelCostSar += cost;
      hotelBreakdown.push({
        label: `${h.city} ${r.quantity}× ${r.roomType} (${nightly} SAR/night × ${h.nights}n)`,
        cost: Math.round(cost * 100) / 100,
      });
    });
  });

  const transportBreakdown = form.transport
    .filter((t) => t.routeId && t.vehicleType)
    .map((t) => ({ label: `${t.vehicleType}`, cost: t.costSar }));
  const transportCostSar = transportBreakdown.reduce((s, t) => s + t.cost, 0);

  const visaResult = calculateVisaCost(
    {
      adult_child_rate_sar: visaRate || 0,
      infant_rate_sar: infantVisaRate,
      counts: {
        adults: form.adults,
        children_with_bed: form.childrenWithBed,
        children_without_bed: form.childrenWithoutBed,
        infants: form.infants,
      },
    },
    DEFAULT_EXCHANGE_RATE
  );

  const upgradesCostSar = calculateUpgradesCost(form, form.upgrades);
  const subtotalSar = hotelCostSar + transportCostSar + visaResult.total_cost_sar + upgradesCostSar;
  const airTicketsPkr = totalAirTicketsPkr(form);
  const grandTotalPkr = visaResult.total_cost_pkr + airTicketsPkr;

  return {
    hotelCostSar: Math.round(hotelCostSar * 100) / 100,
    transportCostSar: Math.round(transportCostSar * 100) / 100,
    visaCostSar: visaResult.total_cost_sar,
    visaCostPkr: visaResult.total_cost_pkr,
    upgradesCostSar,
    subtotalSar: Math.round(subtotalSar * 100) / 100,
    airTicketsPkr,
    grandTotalSar: Math.round(subtotalSar * 100) / 100,
    grandTotalPkr: Math.round(grandTotalPkr * 100) / 100,
    hotelBreakdown,
    transportBreakdown,
  };
}

export function oppositeCity(city: "Makkah" | "Madinah" | ""): "Makkah" | "Madinah" {
  return city === "Makkah" ? "Madinah" : "Makkah";
}
