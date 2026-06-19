import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entitlements = getEntitlements(user);
  return NextResponse.json(entitlements);
}
