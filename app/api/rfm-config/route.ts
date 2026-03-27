import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_THRESHOLDS, type SegmentThreshold } from "@/lib/rfm-config";

const CONFIG_PATH = path.join(process.cwd(), "rfm-config.json");

function loadConfig(): SegmentThreshold[] {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {}
  return DEFAULT_THRESHOLDS;
}

export async function GET() {
  return NextResponse.json(loadConfig());
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/rfm-config error:", err);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
