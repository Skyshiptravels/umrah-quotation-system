"use client";

import { displayDistance, formatDateRange, formatShortDate } from "@/lib/hotel-rate-calculations";

export interface HotelListItem {
  hotel_id: string;
  name: string;
  city: string;
  category: string | null;
  distance_label?: string | null;
  distance_m?: number | null;
  address?: string | null;
  season_start?: string | null;
  season_end?: string | null;
  markaziya_status?: string | null;
  pricing_model?: string | null;
  offers_sharing?: boolean;
  offers_private?: boolean;
  sharing_rate_per_bed?: number | null;
  total_rooms?: string | number;
}

interface Props {
  hotels: HotelListItem[];
  loading: boolean;
  onEdit: (hotelId: string) => void;
  onDelete: (hotel: HotelListItem) => void;
}

export default function HotelList({ hotels, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="card py-12 text-center text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-2" />
        <p>Loading hotels...</p>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="card py-12 text-center text-gray-500">
        <p className="text-lg font-medium text-gray-700">No hotels in this city yet</p>
        <p className="text-sm mt-1">Use &quot;+ Add Hotel&quot; to add your first hotel</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-3 pr-4">Hotel Name</th>
            <th className="pb-3 pr-4">Category</th>
            <th className="pb-3 pr-4">Distance</th>
            <th className="pb-3 pr-4">Location</th>
            <th className="pb-3 pr-4">Check-in</th>
            <th className="pb-3 pr-4">Check-out</th>
            <th className="pb-3 pr-4">Type</th>
            <th className="pb-3 pr-4">Pricing</th>
            <th className="pb-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {hotels.map((h) => (
            <tr key={h.hotel_id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 pr-4 font-medium text-gray-900">
                {h.name}
                {h.markaziya_status === "INSIDE" && (
                  <span className="ml-2 text-xs text-primary-700">Inside Markaziya</span>
                )}
              </td>
              <td className="py-3 pr-4">{h.category || "—"}</td>
              <td className="py-3 pr-4">{displayDistance(h.distance_label, h.distance_m)}</td>
              <td className="py-3 pr-4 max-w-[180px] truncate" title={h.address || ""}>
                {h.address || "—"}
              </td>
              <td className="py-3 pr-4">{formatShortDate(h.season_start || "")}</td>
              <td className="py-3 pr-4">{formatShortDate(h.season_end || "")}</td>
              <td className="py-3 pr-4">
                {h.pricing_model === "ROOM" ? "Room Basis" : h.pricing_model === "SHARING" ? "Sharing" : "—"}
              </td>
              <td className="py-3 pr-4">
                {h.offers_sharing && h.offers_private
                  ? "Both"
                  : h.offers_sharing
                    ? "Sharing"
                    : h.offers_private
                      ? "Private"
                      : "—"}
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  className="text-primary-600 hover:text-primary-800 px-2"
                  title="Edit"
                  onClick={() => onEdit(h.hotel_id)}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="text-red-600 hover:text-red-800 px-2"
                  title="Delete"
                  onClick={() => onDelete(h)}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-3 px-1">
        Showing {hotels.length} hotel{hotels.length !== 1 ? "s" : ""}
        {hotels[0]?.season_start ? ` · Season example: ${formatDateRange(hotels[0].season_start, hotels[0].season_end)}` : ""}
      </p>
    </div>
  );
}
