import { NextRequest, NextResponse } from "next/server";
import { syncAirtableBase } from "@/utils/airtableSync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const baseId = request.nextUrl.searchParams.get("baseId") ?? undefined;
    const projectTag =
      request.nextUrl.searchParams.get("projectTag") ?? undefined;

    const result = await syncAirtableBase({
      baseId: baseId || undefined,
      projectTag: projectTag || undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Airtable sync failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to sync Airtable base";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
