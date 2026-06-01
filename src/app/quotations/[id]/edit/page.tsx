"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import QuotationFormPage from "@/components/quotation/QuotationFormPage";
import {
  apiDetailToFormState,
  QuotationApiDetail,
} from "@/lib/quotation-form-mapper";
import { QuotationFormState } from "@/types/quotation-form";

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const id = params.id as string;
  const [initialForm, setInitialForm] = useState<QuotationFormState | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    apiFetch(`/api/quotations/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load quotation");
        const detail = data as QuotationApiDetail;
        if (detail.quotation.status === "APPROVED") {
          throw new Error("Approved quotations cannot be edited");
        }
        setInitialForm(apiDetailToFormState(detail));
        const updated = detail.quotation.updated_at as string | undefined;
        setSubtitle(
          `Quote #${String(detail.quotation.id).slice(0, 8)}…${
            updated ? ` | Last updated: ${new Date(updated).toLocaleString()}` : ""
          }`
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [user, apiFetch, router, id]);

  if (!user || loading) {
    return <div className="p-6 text-gray-600">Loading quotation...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <button type="button" className="btn-secondary mt-4" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  if (!initialForm) {
    return <div className="p-6">Quotation not found</div>;
  }

  return (
    <QuotationFormPage
      mode="edit"
      quotationId={id}
      initialForm={initialForm}
      title="Edit Quotation"
      subtitle={subtitle}
    />
  );
}
