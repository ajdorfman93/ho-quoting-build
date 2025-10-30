import { NextRequest, NextResponse } from "next/server";
import { deleteRow, updateRow } from "@/utils/tableService";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ table: string; rowId: string }> }
) {
  try {
    const { table, rowId } = await context.params;
    const payload = await request.json();
    const row = await updateRow(table, rowId, payload?.values ?? {});
    return NextResponse.json({ row });
  } catch (error) {
    console.error(
      "Failed to update row",
      error
    );
    return NextResponse.json(
      { error: "Failed to update row" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ table: string; rowId: string }> }
) {
  try {
    const { table, rowId } = await context.params;
    await deleteRow(table, rowId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Failed to delete row",
      error
    );
    return NextResponse.json(
      { error: "Failed to delete row" },
      { status: 500 }
    );
  }
}
