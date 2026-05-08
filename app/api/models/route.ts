// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


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
