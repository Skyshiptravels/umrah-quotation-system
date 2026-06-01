"use client";

import { FieldStatus } from "@/lib/validation";

interface FormFieldProps {
  label: string;
  required?: boolean;
  status?: FieldStatus;
  error?: string;
  tooltip?: string;
  children: React.ReactNode;
  hint?: string;
}

export default function FormField({
  label,
  required,
  status = "idle",
  error,
  tooltip,
  children,
  hint,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-sm font-medium text-gray-700" title={tooltip}>
        {label}
        {required && <span className="text-red-500">*</span>}
        {status === "valid" && <span className="text-green-600 text-xs ml-1">✓</span>}
        {status === "invalid" && <span className="text-red-500 text-xs ml-1">✗</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && status === "invalid" && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
