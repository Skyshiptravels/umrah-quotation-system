"use client";

import FormField from "@/components/quotation/FormField";
import { DEFAULT_EXCHANGE_RATE } from "@/types";
import { QuotationFormState, VisaOption } from "@/types/quotation-form";

interface Props {
  form: QuotationFormState;
  visas: VisaOption[];
  visaCostSar: number;
  visaCostPkr: number;
  onChange: (patch: Partial<QuotationFormState>) => void;
}

export default function VisaTab({ form, visas, visaCostSar, visaCostPkr, onChange }: Props) {
  const selected = visas.find((v) => v.category_id === form.visaCategoryId);
  const peopleCount = form.adults + form.childrenWithBed + form.childrenWithoutBed;
  const peopleCost = peopleCount * (selected?.adult_child_rate_sar || 0);
  const infantCost = form.infants * (selected?.infant_rate_sar || 490);

  return (
    <div className="space-y-6">
      <FormField
        label="Visa Category"
        required
        tooltip="Infant rate is always 490 SAR regardless of category"
      >
        <select
          className="input"
          value={form.visaCategoryId}
          onChange={(e) => onChange({ visaCategoryId: e.target.value })}
        >
          <option value="">Select visa category</option>
          {visas.map((v) => (
            <option key={v.category_id} value={v.category_id}>
              {v.name} ({v.adult_child_rate_sar} SAR/person, {v.infant_rate_sar} SAR/infant)
            </option>
          ))}
        </select>
      </FormField>

      {selected && (
        <div className="border rounded-xl p-5 bg-gray-50 space-y-2 text-sm">
          <p className="font-semibold text-gray-800">{selected.name}</p>
          <p className="text-gray-600">
            {selected.adult_child_rate_sar} SAR per Adult/Child · {selected.infant_rate_sar} SAR per Infant
          </p>
          <div className="mt-4 space-y-1 font-mono text-sm bg-white p-4 rounded-lg border">
            <p>
              {peopleCount} people × {selected.adult_child_rate_sar} SAR = {peopleCost.toLocaleString()} SAR
            </p>
            <p>
              {form.infants} infant × {selected.infant_rate_sar} SAR = {infantCost.toLocaleString()} SAR
            </p>
            <p className="border-t pt-2 font-bold text-primary-700">
              TOTAL VISA COST: {visaCostSar.toLocaleString()} SAR ({visaCostPkr.toLocaleString()} PKR)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
