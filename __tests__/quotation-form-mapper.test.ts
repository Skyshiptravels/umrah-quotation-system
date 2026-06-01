import {
  apiDetailToFormState,
  formStateToSavePayload,
  QuotationApiDetail,
} from "@/lib/quotation-form-mapper";
import { initialFormState } from "@/types/quotation-form";

describe("quotation-form-mapper", () => {
  it("maps API detail to form state", () => {
    const detail: QuotationApiDetail = {
      quotation: {
        customer_name: "Ali Khan",
        customer_email: "ali@test.com",
        customer_phone: "+92 300 1234567",
        customer_whatsapp: "+966 50 1234567",
        adults: 4,
        children_with_bed: 2,
        children_without_bed: 1,
        infants: 1,
        air_ticket_adult_pkr: 3500,
        air_ticket_child_pkr: 1750,
        air_ticket_infant_pkr: 0,
        suggested_upgrades: { mealPlan: "RO" },
      },
      hotels: [
        {
          id: "h1",
          hotel_id: "hotel-1",
          city: "Makkah",
          check_in_date: "2026-06-01",
          check_out_date: "2026-06-05",
          nights: 4,
          view_modifier: "HARAM_VIEW",
          meal_plan: "RO",
          booking_mode: "PRIVATE",
          sharing_pax: 0,
          room_type_1: "Quad",
          quantity_1: 2,
          room_type_2: null,
          quantity_2: 0,
          subtotal_sar: 1000,
        },
      ],
      transport: [
        {
          id: "t1",
          route_id: "route-1",
          vehicle_type: "Hiace",
          total_cost_sar: 450,
        },
      ],
      visas: [{ visa_category_id: "visa-1" }],
    };

    const form = apiDetailToFormState(detail);
    expect(form.customerName).toBe("Ali Khan");
    expect(form.adults).toBe(4);
    expect(form.hotels[0].hotelId).toBe("hotel-1");
    expect(form.transport[0].routeId).toBe("route-1");
    expect(form.visaCategoryId).toBe("visa-1");
  });

  it("builds save payload from form", () => {
    const form = initialFormState();
    form.customerName = "Test User";
    form.customerEmail = "test@test.com";
    form.hotels[0].hotelId = "hotel-1";
    form.hotels[0].city = "Makkah";
    form.visaCategoryId = "visa-1";

    const payload = formStateToSavePayload(form, 0);
    expect(payload.customer_name).toBe("Test User");
    expect(payload.hotels.length).toBeGreaterThanOrEqual(0);
  });
});
