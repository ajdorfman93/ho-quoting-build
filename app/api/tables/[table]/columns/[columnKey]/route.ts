import { NextResponse } from "next/server";
import { deleteColumn, updateColumn } from "@/utils/tableService";

export async function PATCH(
  request: Request,
  { params }: { params: { table: string; columnKey: string } }
) {
  try {
    const payload = await request.json();
    const column = await updateColumn(params.table, params.columnKey, {
      name: payload?.name,
      type: payload?.type,
      config: payload?.config,
      width: payload?.width,
    });

    return NextResponse.json({ column });
  } catch (error) {
    console.error(
      `Failed to update column ${params.columnKey} on ${params.table}`,
      error
    );
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { table: string; columnKey: string } }
) {
  try {
    await deleteColumn(params.table, params.columnKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      `Failed to delete column ${params.columnKey} from ${params.table}`,
      error
    );
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
