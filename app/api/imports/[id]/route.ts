export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { imports } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const imp = await db.select().from(imports).where(eq(imports.id, id)).get();
    if (!imp) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(imp);
  } catch (error) {
    console.error("GET /api/imports/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
