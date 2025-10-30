import { NextResponse } from "next/server";
import { reorderColumns } from "@/utils/tableService";

export async function PATCH(
  request: Request,
  { params }: { params: { table: string } }
) {
  try {
    const payload = await request.json();
    const order: string[] = Array.isArray(payload?.order) ? payload.order : [];
    await reorderColumns(params.table, order);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`Failed to reorder columns for ${params.table}`, error);
    return NextResponse.json(
      { error: "Failed to reorder columns" },
      { status: 500 }
    );
  }
}
