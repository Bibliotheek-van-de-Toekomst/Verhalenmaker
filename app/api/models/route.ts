import { NextResponse } from "next/server";
import { beschikbareModellen, standaardModel } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const modellen = beschikbareModellen().map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    beschrijving: m.beschrijving,
  }));
  const standaard = standaardModel();
  return NextResponse.json({
    modellen,
    standaardModel: standaard?.id ?? null,
  });
}
