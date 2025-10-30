import { NextRequest, NextResponse } from "next/server";
import { createRow } from "@/utils/tableService";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params;
    const payload = await request.json();
    const row = await createRow(table, payload?.values ?? {});
    return NextResponse.json({ row });
  } catch (error) {
    console.error("Failed to create row", error);
    return NextResponse.json(
      { error: "Failed to create row" },
      { status: 500 }
    );
  }
}
