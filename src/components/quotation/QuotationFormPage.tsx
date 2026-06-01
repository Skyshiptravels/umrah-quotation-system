"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PassengersTab from "@/components/quotation/PassengersTab";
import HotelsTab from "@/components/quotation/HotelsTab";
import TransportTab from "@/components/quotation/TransportTab";
import VisaTab from "@/components/quotation/VisaTab";
import SummaryTab from "@/components/quotation/SummaryTab";
import VendorIntegrationPanel, {
  fetchVendorBreakdownForForm,
} from "@/components/quotation/VendorIntegrationPanel";
import { previewQuotationCosts } from "@/lib/quotation-form-calculations";
import { validateQuotationForm } from "@/lib/validation";
import { formStateToSavePayload } from "@/lib/quotation-form-mapper";
import {
  HotelOption,
  initialFormState,
  QuotationFormState,
  RoomTypeOption,
  RouteOption,
  TABS,
  TabId,
  VisaOption,
  VehicleOption,
} from "@/types/quotation-form";

export interface QuotationFormPageProps {
  mode: "create" | "edit";
  quotationId?: string;
  initialForm?: QuotationFormState;
  title: string;
  subtitle?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function draftStorageKey(userId: string) {
  return `umrah-quotation-draft-${userId}`;
}

export default function QuotationFormPage({
  mode,
  quotationId: initialQuotationId,
  initialForm,
  title,
  subtitle,
}: QuotationFormPageProps) {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("passengers");
  const [form, setForm] = useState<QuotationFormState>(initialForm || initialFormState());
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [visas, setVisas] = useState<VisaOption[]>([]);
  const [roomTypesByHotel, setRoomTypesByHotel] = useState<Record<string, RoomTypeOption[]>>({});
  const [vehiclesByRoute, setVehiclesByRoute] = useState<Record<string, VehicleOption[]>>({});
  const [clients, setClients] = useState<
    Array<{ id: string; full_name: string; email: string; phone: string; whatsapp_number?: string | null }>
  >([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [quotationId, setQuotationId] = useState<string | undefined>(initialQuotationId);

  const formRef = useRef(form);
  formRef.current = form;
  const quotationIdRef = useRef(quotationId);
  quotationIdRef.current = quotationId;

  const patchForm = useCallback((patch: Partial<QuotationFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSelectClient = useCallback(
    (client: { id: string; full_name: string; email: string; phone: string; whatsapp_number?: string | null } | null) => {
      if (!client) return;
      patchForm({
        clientId: client.id,
        customerName: client.full_name,
        customerEmail: client.email,
        customerPhone: client.phone,
        customerWhatsapp: client.whatsapp_number || client.phone,
      });
    },
    [patchForm]
  );

  const touch = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  useEffect(() => {
    if (initialForm) setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    if (!user || mode !== "create") return;
    try {
      const raw = localStorage.getItem(draftStorageKey(user.id));
      if (raw && !initialForm) {
        const parsed = JSON.parse(raw) as { form?: QuotationFormState; quotationId?: string };
        if (parsed.form) setForm(parsed.form);
        if (parsed.quotationId) setQuotationId(parsed.quotationId);
      }
    } catch {
      /* ignore */
    }
  }, [user, mode, initialForm]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch("/api/hotels?limit=100").then((r) => r.json()),
      apiFetch("/api/transport/routes").then((r) => r.json()),
      apiFetch("/api/visa/categories").then((r) => r.json()),
      apiFetch("/api/clients?status=active").then((r) => r.json()),
    ]).then(([h, r, v, c]) => {
      setHotels(h.data || []);
      setRoutes(r.data || []);
      setVisas(v.data || []);
      setClients(c.data || []);
      if (mode === "create" && !formRef.current.visaCategoryId) {
        const brn28 = (v.data || []).find((x: VisaOption) => x.code === "VISA_BRN_28");
        if (brn28) patchForm({ visaCategoryId: brn28.category_id });
      }
    });
  }, [user, apiFetch, patchForm, mode]);

  useEffect(() => {
    if (!user) return;
    for (const block of form.hotels) {
      if (block.hotelId && !roomTypesByHotel[block.hotelId]) {
        void loadRooms(block.hotelId);
      }
    }
    for (const t of form.transport) {
      if (t.routeId && !vehiclesByRoute[t.routeId]) {
        void loadVehicles(t.routeId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.hotels, form.transport, user]);

  const selectedVisaRate =
    visas.find((v) => v.category_id === form.visaCategoryId)?.adult_child_rate_sar || 0;

  const preview = useMemo(
    () => previewQuotationCosts(form, selectedVisaRate),
    [form, selectedVisaRate]
  );

  const validation = useMemo(() => validateQuotationForm(form), [form]);

  const persistLocalDraft = useCallback(() => {
    if (!user) return;
    try {
      localStorage.setItem(
        draftStorageKey(user.id),
        JSON.stringify({ form: formRef.current, quotationId: quotationIdRef.current })
      );
    } catch {
      /* ignore */
    }
  }, [user]);

  const runAutoSave = useCallback(async () => {
    if (!user) return;
    const f = formRef.current;
    const visaRate =
      visas.find((v) => v.category_id === f.visaCategoryId)?.adult_child_rate_sar || 0;
    const previewCosts = previewQuotationCosts(f, visaRate);
    const vendorBreakdown = await fetchVendorBreakdownForForm(
      apiFetch,
      f,
      previewCosts.grandTotalSar
    );
    const payload = formStateToSavePayload(f, previewCosts.upgradesCostSar, {
      draft: true,
      vendor_cost_breakdown: vendorBreakdown,
    });
    payload.draft_form = f;

    setSaveStatus("saving");
    persistLocalDraft();

    try {
      let qid = quotationIdRef.current;
      if (qid) {
        const res = await apiFetch(`/api/quotations/${qid}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Draft save failed");
      } else {
        const res = await apiFetch("/api/quotations", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            draft: true,
            draft_form: f,
            customer_name: f.customerName || "Draft Quotation",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Draft create failed");
        qid = data.quotation_id;
        setQuotationId(qid);
        quotationIdRef.current = qid;
      }
      setSaveStatus("saved");
      setLastSaved(new Date());
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [user, apiFetch, persistLocalDraft, visas]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      void runAutoSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, runAutoSave]);

  useEffect(() => {
    const t = setTimeout(persistLocalDraft, 1000);
    return () => clearTimeout(t);
  }, [form, persistLocalDraft]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  async function loadRooms(hotelId: string) {
    const res = await apiFetch(`/api/hotels/${hotelId}`);
    const data = await res.json();
    setRoomTypesByHotel((prev) => ({
      ...prev,
      [hotelId]: (data.room_types || []).map((r: RoomTypeOption) => ({
        room_type: r.room_type,
        base_price_sar: Number(r.base_price_sar),
        max_occupancy: r.max_occupancy,
      })),
    }));
  }

  async function loadVehicles(routeId: string): Promise<VehicleOption[]> {
    const res = await apiFetch(`/api/transport/options/${routeId}`);
    const data = await res.json();
    const options = (data.options || []).map((o: VehicleOption) => ({
      vehicle_type: o.vehicle_type,
      capacity: o.capacity,
      price_sar: Number(o.price_sar),
    }));
    setVehiclesByRoute((prev) => ({ ...prev, [routeId]: options }));
    return options;
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");
    setTouched({
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customerWhatsapp: true,
      adults: true,
      airTicketAdultPkr: true,
    });

    if (!validation.valid) {
      setError("Please fill all required fields marked with *");
      return;
    }

    setSubmitting(true);
    try {
      const f = formRef.current;
      const vendorBreakdown = await fetchVendorBreakdownForForm(
        apiFetch,
        f,
        preview.grandTotalSar
      );
      const payload = formStateToSavePayload(f, preview.upgradesCostSar, {
        vendor_cost_breakdown: vendorBreakdown,
      });

      if (mode === "edit" && quotationId) {
        const res = await apiFetch(`/api/quotations/${quotationId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");

        await apiFetch(`/api/quotations/${quotationId}/calculate`, { method: "POST" });
        setSuccess("Quotation updated successfully");
        if (user) localStorage.removeItem(draftStorageKey(user.id));
        router.push(`/quotations/${quotationId}`);
        return;
      }

      let qid = quotationIdRef.current;
      if (qid) {
        const res = await apiFetch(`/api/quotations/${qid}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Update failed");
        }
      } else {
        const createdRes = await apiFetch("/api/quotations", {
          method: "POST",
          body: JSON.stringify({
            customer_name: payload.customer_name,
            customer_email: payload.customer_email,
            customer_phone: payload.customer_phone,
            customer_whatsapp: payload.customer_whatsapp,
            adults: payload.adults,
            children_with_bed: payload.children_with_bed,
            children_without_bed: payload.children_without_bed,
            infants: payload.infants,
            air_ticket_adult_pkr: payload.air_ticket_adult_pkr,
            air_ticket_child_pkr: payload.air_ticket_child_pkr,
            air_ticket_infant_pkr: payload.air_ticket_infant_pkr,
            flights_cost_pkr: payload.flights_cost_pkr,
            suggested_upgrades: payload.suggested_upgrades,
            upgrades_cost_sar: payload.upgrades_cost_sar,
            transfers_cost_sar: 0,
          }),
        });
        const created = await createdRes.json();
        if (!createdRes.ok) throw new Error(created.error || "Create failed");
        qid = created.quotation_id;
      }

      const updateRes = await apiFetch(`/api/quotations/${qid}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!updateRes.ok) {
        const data = await updateRes.json();
        throw new Error(data.error || "Failed to save line items");
      }

      await apiFetch(`/api/quotations/${qid}/calculate`, { method: "POST" });
      if (user) localStorage.removeItem(draftStorageKey(user.id));
      router.push(`/quotations/${qid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quotation");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  const submitLabel =
    mode === "edit"
      ? submitting
        ? "Updating..."
        : "Update Quotation"
      : submitting
        ? "Creating..."
        : "Create Quotation";

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-primary-600 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {validation.tabErrors[tab.id]?.length ? (
              <span className="ml-1 text-red-300">!</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="card min-h-[400px]">
        {activeTab === "passengers" && (
          <PassengersTab
            form={form}
            touched={touched}
            clients={clients}
            onChange={patchForm}
            onTouch={touch}
            onSelectClient={handleSelectClient}
          />
        )}
        {activeTab === "hotels" && (
          <HotelsTab
            form={form}
            hotels={hotels}
            roomTypesByHotel={roomTypesByHotel}
            onChange={patchForm}
            onLoadRooms={loadRooms}
          />
        )}
        {activeTab === "transport" && (
          <TransportTab
            form={form}
            routes={routes}
            vehiclesByRoute={vehiclesByRoute}
            onChange={patchForm}
            onLoadVehicles={loadVehicles}
          />
        )}
        {activeTab === "visa" && (
          <VisaTab
            form={form}
            visas={visas}
            visaCostSar={preview.visaCostSar}
            visaCostPkr={preview.visaCostPkr}
            onChange={patchForm}
          />
        )}
        {activeTab === "summary" && (
          <>
            <VendorIntegrationPanel
              form={form}
              revenueSar={preview.grandTotalSar}
              apiFetch={apiFetch}
              onChange={patchForm}
            />
            <SummaryTab preview={preview} showBreakdownDefault />
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mt-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t shadow-lg p-4 flex flex-col items-center gap-2">
        <div className="text-xs text-gray-500 min-h-[1rem]">
          {saveStatus === "saving" && <span className="text-blue-600">Saving draft...</span>}
          {saveStatus === "saved" && lastSaved && (
            <span className="text-green-600">
              Draft saved at {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-red-600">Draft save failed (local copy kept)</span>
          )}
        </div>
        <button
          type="button"
          className="btn-primary px-12 py-3 text-base disabled:opacity-50"
          disabled={submitting || !validation.valid}
          title={!validation.valid ? "Please fill all required fields" : undefined}
          onClick={handleSubmit}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
