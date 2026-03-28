export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const all = await db.select().from(accounts).all();
    return NextResponse.json(all);
  } catch (error) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const result = await db.insert(accounts).values({
      name: name.trim(),
      created_at: new Date().toISOString(),
    }).run();
    const created = await db.select().from(accounts).where(eq(accounts.id, Number(result.lastInsertRowid))).get();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const all = await db.select().from(accounts).all();
    if (all.length <= 1) {
      return NextResponse.json({ error: "No se puede eliminar la única cuenta" }, { status: 400 });
    }
    await db.delete(accounts).where(eq(accounts.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
