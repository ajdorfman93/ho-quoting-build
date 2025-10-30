import { NextRequest, NextResponse } from "next/server";
import { deleteColumn, updateColumn } from "@/utils/tableService";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ table: string; columnKey: string }> }
) {
  try {
    const { table, columnKey } = await context.params;
    const payload = await request.json();
    const column = await updateColumn(table, columnKey, {
      name: payload?.name,
      type: payload?.type,
      config: payload?.config,
      width: payload?.width,
    });

    return NextResponse.json({ column });
  } catch (error) {
    console.error(
      "Failed to update column",
      error
    );
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ table: string; columnKey: string }> }
) {
  try {
    const { table, columnKey } = await context.params;
    await deleteColumn(table, columnKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Failed to delete column",
      error
    );
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
