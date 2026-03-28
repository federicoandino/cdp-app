export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { evaluateSegmentCount } from "@/lib/segment-engine";
import { getAccountId } from "@/lib/get-account-id";
import type { SegmentFilter } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const accountId = getAccountId();
    const body = await request.json();
    const filters: SegmentFilter[] = body.filters ?? [];
    const count = await evaluateSegmentCount(filters, accountId);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("POST /api/segments/preview error:", error);
    return NextResponse.json({ error: "Error evaluating segment" }, { status: 500 });
  }
}
