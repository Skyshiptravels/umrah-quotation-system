"use client";

import FormField from "@/components/quotation/FormField";
import {
  formatDisplayDate,
  getExpiryDate,
  totalPassengers,
  tripDuration,
} from "@/lib/quotation-form-calculations";
import { fieldStatus, validateEmail, validatePhone } from "@/lib/validation";
import { QuotationFormState } from "@/types/quotation-form";

interface ClientOption {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp_number?: string | null;
}

interface Props {
  form: QuotationFormState;
  touched: Record<string, boolean>;
  clients: ClientOption[];
  onChange: (patch: Partial<QuotationFormState>) => void;
  onTouch: (field: string) => void;
  onSelectClient: (client: ClientOption | null) => void;
}

export default function PassengersTab({
  form,
  touched,
  clients,
  onChange,
  onTouch,
  onSelectClient,
}: Props) {
  const total = totalPassengers(form);
  const duration = tripDuration(form.hotels);
  const expiry = getExpiryDate();

  return (
    <div className="space-y-6">
      <FormField
        label="Link Existing Client"
        tooltip="Select a client to auto-fill contact details"
      >
        <select
          className="input"
          value={form.clientId}
          onChange={(e) => {
            const id = e.target.value;
            onChange({ clientId: id });
            const client = clients.find((c) => c.id === id) || null;
            onSelectClient(client);
          }}
        >
          <option value="">— New customer (manual entry) —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} ({c.email})
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Customer Name"
          required
          tooltip="Full name of the customer"
          status={fieldStatus(form.customerName, true, touched.customerName)}
          error="This field is required"
        >
          <input
            className="input"
            placeholder="Enter customer name"
            value={form.customerName}
            onChange={(e) => onChange({ customerName: e.target.value })}
            onBlur={() => onTouch("customerName")}
          />
        </FormField>

        <FormField
          label="Customer Email"
          required
          tooltip="Used for sending quotation"
          status={
            !form.customerEmail
              ? fieldStatus("", true, touched.customerEmail)
              : validateEmail(form.customerEmail)
                ? "valid"
                : touched.customerEmail
                  ? "invalid"
                  : "idle"
          }
          error="Enter a valid email address"
        >
          <input
            className="input"
            type="email"
            placeholder="example@gmail.com"
            value={form.customerEmail}
            onChange={(e) => onChange({ customerEmail: e.target.value })}
            onBlur={() => onTouch("customerEmail")}
          />
        </FormField>

        <FormField
          label="Customer Phone Number"
          required
          tooltip="Used for SMS updates and emergency contact"
          status={
            !form.customerPhone
              ? fieldStatus("", true, touched.customerPhone)
              : validatePhone(form.customerPhone)
                ? "valid"
                : touched.customerPhone
                  ? "invalid"
                  : "idle"
          }
          error="Format: +92 3XX XXX XXXX"
        >
          <input
            className="input"
            placeholder="+92 3XX XXX XXXX"
            value={form.customerPhone}
            onChange={(e) => onChange({ customerPhone: e.target.value })}
            onBlur={() => onTouch("customerPhone")}
          />
        </FormField>

        <FormField
          label="Customer WhatsApp No."
          required
          tooltip="Used for quotation sharing and communication"
          status={
            !form.customerWhatsapp
              ? fieldStatus("", true, touched.customerWhatsapp)
              : validatePhone(form.customerWhatsapp)
                ? "valid"
                : touched.customerWhatsapp
                  ? "invalid"
                  : "idle"
          }
          error="Format: +966 XX XXX XXXX"
        >
          <input
            className="input"
            placeholder="+966 XX XXX XXXX"
            value={form.customerWhatsapp}
            onChange={(e) => onChange({ customerWhatsapp: e.target.value })}
            onBlur={() => onTouch("customerWhatsapp")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          [
            ["Adults", "adults"],
            ["Child With Bed", "childrenWithBed"],
            ["Child Without Bed", "childrenWithoutBed"],
            ["Infants", "infants"],
          ] as const
        ).map(([label, key]) => (
          <FormField
            key={key}
            label={label}
            required
            status={fieldStatus(form[key], true, touched[key])}
            error="Required"
          >
            <input
              className="input"
              type="number"
              min={0}
              value={form[key]}
              onChange={(e) => onChange({ [key]: parseInt(e.target.value) || 0 })}
              onBlur={() => onTouch(key)}
            />
          </FormField>
        ))}
      </div>

      <div className="bg-primary-50 border border-primary-100 rounded-lg px-4 py-3">
        <p className="text-sm font-semibold text-primary-800">
          Total Passengers: <span className="text-lg">{total}</span>
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Air Ticket Rates (PKR) <span className="text-red-500">*</span>
        </h3>
        <p className="text-xs text-gray-500 mb-3" title="Enter actual flight ticket prices per passenger">
          Enter actual flight ticket prices per passenger
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              ["Adult", "airTicketAdultPkr"],
              ["Child", "airTicketChildPkr"],
              ["Infant", "airTicketInfantPkr"],
            ] as const
          ).map(([label, key]) => (
            <FormField
              key={key}
              label={`${label} (PKR)`}
              required={key === "airTicketAdultPkr"}
              status={fieldStatus(form[key], key === "airTicketAdultPkr", touched[key])}
            >
              <input
                className="input"
                type="number"
                min={0}
                value={form[key]}
                onChange={(e) => onChange({ [key]: parseFloat(e.target.value) || 0 })}
                onBlur={() => onTouch(key)}
              />
            </FormField>
          ))}
        </div>
      </div>

      {(duration.nights > 0 || form.hotels.length > 0) && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Trip Duration</p>
          <p className="text-sm font-medium mt-1">
            Total Days: {duration.days || "—"} days · Total Nights: {duration.nights || "—"} nights
          </p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 border">
        <p className="text-xs text-gray-500 uppercase tracking-wide">This quotation valid until</p>
        <p className="text-sm font-medium mt-1 text-primary-700">{formatDisplayDate(expiry)}</p>
      </div>
    </div>
  );
}
