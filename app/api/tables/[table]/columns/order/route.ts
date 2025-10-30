import { NextRequest, NextResponse } from "next/server";
import { reorderColumns } from "@/utils/tableService";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params;
    const payload = await request.json();
    const order: string[] = Array.isArray(payload?.order) ? payload.order : [];
    await reorderColumns(table, order);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reorder columns", error);
    return NextResponse.json(
      { error: "Failed to reorder columns" },
      { status: 500 }
    );
  }
}
