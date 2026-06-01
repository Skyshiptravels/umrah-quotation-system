"use client";

import FormField from "@/components/quotation/FormField";
import { QuotationFormState, RouteOption, TransportLine, VehicleOption } from "@/types/quotation-form";

interface Props {
  form: QuotationFormState;
  routes: RouteOption[];
  vehiclesByRoute: Record<string, VehicleOption[]>;
  onChange: (patch: Partial<QuotationFormState>) => void;
  onLoadVehicles: (routeId: string) => Promise<VehicleOption[]>;
}

export default function TransportTab({
  form,
  routes,
  vehiclesByRoute,
  onChange,
  onLoadVehicles,
}: Props) {
  function updateLine(index: number, patch: Partial<TransportLine>) {
    const next = [...form.transport];
    next[index] = { ...next[index], ...patch };
    onChange({ transport: next });
  }

  function addRoute() {
    onChange({
      transport: [
        ...form.transport,
        { id: crypto.randomUUID(), routeId: "", vehicleType: "", costSar: 0, capacity: 0 },
      ],
    });
  }

  const total = form.transport.reduce((s, t) => s + (t.costSar || 0), 0);

  return (
    <div className="space-y-6">
      {form.transport.map((line, i) => {
        const vehicles = vehiclesByRoute[line.routeId] || [];
        const route = routes.find((r) => r.route_id === line.routeId);

        return (
          <div key={line.id} className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
            <h3 className="font-semibold text-primary-800">Route {i + 1}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Route" required tooltip="Journey from one city to another">
                <select
                  className="input"
                  value={line.routeId}
                  onChange={async (e) => {
                    const routeId = e.target.value;
                    updateLine(i, { routeId, vehicleType: "", costSar: 0, capacity: 0 });
                    if (routeId) await onLoadVehicles(routeId);
                  }}
                >
                  <option value="">Select route</option>
                  {routes.map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Vehicle"
                required
                tooltip="Transportation type and passenger capacity"
              >
                <select
                  className="input"
                  value={line.vehicleType}
                  onChange={(e) => {
                    const v = vehicles.find((x) => x.vehicle_type === e.target.value);
                    updateLine(i, {
                      vehicleType: e.target.value,
                      costSar: v?.price_sar || 0,
                      capacity: v?.capacity || 0,
                    });
                  }}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.vehicle_type} value={v.vehicle_type}>
                      {v.vehicle_type} — {v.capacity} pax, {v.price_sar} SAR
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Cost (SAR)" tooltip="Total cost for entire vehicle on this route">
                <input className="input bg-gray-100" readOnly value={line.costSar ? `${line.costSar} SAR` : "—"} />
              </FormField>
            </div>

            {line.routeId && line.vehicleType && (
              <p className="text-xs text-green-700">
                Route Added: {route?.name}, {line.vehicleType}, {line.costSar} SAR (total vehicle cost, not
                per person). Infants travel free.
              </p>
            )}
          </div>
        );
      })}

      <button type="button" className="btn-secondary" onClick={addRoute}>
        + Add New Route
      </button>

      <div className="bg-primary-50 border border-primary-100 rounded-lg px-4 py-3">
        <p className="text-sm font-semibold text-primary-800">
          Total Transport Cost: {total.toLocaleString()} SAR
        </p>
      </div>
    </div>
  );
}
