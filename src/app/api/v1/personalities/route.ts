import { NextResponse } from "next/server";
import { PERSONALITIES } from "@/lib/personalities";

export const runtime = "nodejs";

export async function GET() {
  const safePersonalities = PERSONALITIES.map(({ id, name, description, image }) => ({
    id,
    name,
    description,
    image,
  }));

  return NextResponse.json({ personalities: safePersonalities });
}
