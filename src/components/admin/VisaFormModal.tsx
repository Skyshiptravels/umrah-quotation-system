"use client";

import { useEffect, useState } from "react";

export interface VisaCategory {
  id: string;
  code: string;
  name: string;
  adult_child_rate_sar: number;
  infant_rate_sar: number;
  processing_time_days: number;
  validity_days: number;
  documents_required: string[];
  special_conditions: string;
  commission_percent: number;
  is_active: boolean;
  summer_rate_multiplier: number;
  winter_rate_multiplier: number;
}

export interface VisaFormData {
  code: string;
  name: string;
  adult_child_rate_sar: number;
  infant_rate_sar: number;
  processing_time_days: number;
  validity_days: number;
  documents_required: string[];
  special_conditions: string;
  is_active: boolean;
  commission_percent: number;
  summer_rate_multiplier: number;
  winter_rate_multiplier: number;
}

const defaultForm = (): VisaFormData => ({
  code: "",
  name: "",
  adult_child_rate_sar: 480,
  infant_rate_sar: 490,
  processing_time_days: 3,
  validity_days: 28,
  documents_required: ["Passport", "Photo"],
  special_conditions: "",
  is_active: true,
  commission_percent: 5,
  summer_rate_multiplier: 1,
  winter_rate_multiplier: 1,
});

export function visaToForm(visa?: VisaCategory | null): VisaFormData {
  if (!visa) return defaultForm();
  return {
    code: visa.code,
    name: visa.name,
    adult_child_rate_sar: visa.adult_child_rate_sar,
    infant_rate_sar: visa.infant_rate_sar,
    processing_time_days: visa.processing_time_days,
    validity_days: visa.validity_days,
    documents_required: [...visa.documents_required],
    special_conditions: visa.special_conditions,
    is_active: visa.is_active,
    commission_percent: visa.commission_percent,
    summer_rate_multiplier: visa.summer_rate_multiplier,
    winter_rate_multiplier: visa.winter_rate_multiplier,
  };
}

export default function VisaFormModal({
  visa,
  onSave,
  onCancel,
}: {
  visa?: VisaCategory | null;
  onSave: (data: VisaFormData) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<VisaFormData>(() => visaToForm(visa));
  const [newDoc, setNewDoc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(visaToForm(visa));
  }, [visa]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold">
            {visa ? "Edit Visa Category" : "Add Visa Category"}
          </h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!visa && (
            <div>
              <label className="label">Code *</label>
              <input
                className="input font-mono"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="VISA_BRN_28"
              />
            </div>
          )}

          <div>
            <label className="label">Display Name *</label>
            <input
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Adult/Child SAR *</label>
              <input
                type="number"
                className="input"
                value={formData.adult_child_rate_sar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    adult_child_rate_sar: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="label">Infant SAR *</label>
              <input
                type="number"
                className="input"
                value={formData.infant_rate_sar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    infant_rate_sar: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Processing Time (days)</label>
              <input
                type="number"
                className="input"
                value={formData.processing_time_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    processing_time_days: parseInt(e.target.value, 10) || 3,
                  })
                }
              />
            </div>
            <div>
              <label className="label">Validity (days)</label>
              <input
                type="number"
                className="input"
                value={formData.validity_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    validity_days: parseInt(e.target.value, 10) || 28,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Commission %</label>
              <input
                type="number"
                step={0.1}
                className="input"
                value={formData.commission_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="label">Summer Multiplier</label>
              <input
                type="number"
                step={0.01}
                className="input"
                value={formData.summer_rate_multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    summer_rate_multiplier: parseFloat(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div>
              <label className="label">Winter Multiplier</label>
              <input
                type="number"
                step={0.01}
                className="input"
                value={formData.winter_rate_multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    winter_rate_multiplier: parseFloat(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="label">Documents Required</label>
            <div className="space-y-2 mb-2">
              {formData.documents_required.map((doc, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={doc}
                    onChange={(e) => {
                      const updated = [...formData.documents_required];
                      updated[i] = e.target.value;
                      setFormData({ ...formData, documents_required: updated });
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        documents_required: formData.documents_required.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                placeholder="Add document"
              />
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => {
                  if (newDoc.trim()) {
                    setFormData({
                      ...formData,
                      documents_required: [...formData.documents_required, newDoc.trim()],
                    });
                    setNewDoc("");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="label">Special Conditions</label>
            <textarea
              className="input"
              rows={3}
              value={formData.special_conditions}
              onChange={(e) =>
                setFormData({ ...formData, special_conditions: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label">Status</label>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.is_active}
                  onChange={() => setFormData({ ...formData, is_active: true })}
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!formData.is_active}
                  onChange={() => setFormData({ ...formData, is_active: false })}
                />
                Inactive
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3 sticky bottom-0 bg-white">
          <button type="button" className="btn-primary flex-1" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
