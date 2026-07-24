import { NextResponse } from "next/server";
import type { User } from "@prisma/client";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function mapUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    gender: user.gender,
    nickname: user.nickname,
    partner_nickname: user.partnerNickname,
    relationship_date: user.relationshipDate
      ? user.relationshipDate.toISOString().slice(0, 10)
      : null,
    partner_user_id: user.partnerUserId,
    latitude: user.latitude,
    longitude: user.longitude,
    location_updated_at: user.locationUpdatedAt
      ? user.locationUpdatedAt.toISOString()
      : null,
  };
}

export async function readJson<T = Record<string, unknown>>(
  request: Request
): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
