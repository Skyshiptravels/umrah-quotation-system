import { NextRequest } from "next/server";
import {
  generateRoomAssignmentOptions,
  getBedsNeeded,
} from "@/lib/calculations/hotel";
import { requireAuth, isAuthContext, ok, badRequest } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const body = await request.json();
  const { adults, children_with_bed, children_without_bed, infants, available_room_types } = body;

  const counts = {
    adults: adults ?? 0,
    children_with_bed: children_with_bed ?? 0,
    children_without_bed: children_without_bed ?? 0,
    infants: infants ?? 0,
  };

  const bedsNeeded = getBedsNeeded(counts);
  const roomTypes =
    available_room_types || ["Quad", "Triple", "Double", "Single"];

  const options = generateRoomAssignmentOptions(bedsNeeded, roomTypes);

  return ok({
    beds_needed: bedsNeeded,
    passengers: counts,
    options,
  });
}
