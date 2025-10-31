import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncAirtableBase } from "@/utils/airtableSync";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET =
  process.env.AIRTABLE_WEBHOOK_SECRET ?? process.env.AIRTABLE_HOOK_SECRET ?? "";

function verifySignature(request: NextRequest, body: string): boolean {
  if (!WEBHOOK_SECRET) return true;

  const timestamp =
    request.headers.get("X-Airtable-Webhook-Request-Timestamp") ?? "";
  const signature =
    request.headers.get("X-Airtable-Webhook-Request-Signature") ?? "";

  if (!timestamp || !signature) return false;

  const payload = `${timestamp}.${body}`;
  const digest = createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("base64");

  return signature === digest;
}

export async function POST(request: NextRequest) {
  const handshakeSecret = request.headers.get("X-Airtable-Hook-Secret");
  if (handshakeSecret) {
    return new NextResponse(null, {
      status: 200,
      headers: { "X-Airtable-Hook-Secret": handshakeSecret },
    });
  }

  const body = await request.text();
  if (!verifySignature(request, body)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  try {
    await syncAirtableBase();
  } catch (error) {
    console.error("Failed to process Airtable webhook", error);
    return NextResponse.json(
      { ok: false, error: "Failed to sync Airtable base" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
