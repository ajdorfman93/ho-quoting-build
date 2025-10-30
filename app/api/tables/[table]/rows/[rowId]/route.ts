import { NextResponse } from "next/server";
import { deleteRow, updateRow } from "@/utils/tableService";

export async function PATCH(
  request: Request,
  { params }: { params: { table: string; rowId: string } }
) {
  try {
    const payload = await request.json();
    const row = await updateRow(params.table, params.rowId, payload?.values ?? {});
    return NextResponse.json({ row });
  } catch (error) {
    console.error(
      `Failed to update row ${params.rowId} in ${params.table}`,
      error
    );
    return NextResponse.json(
      { error: "Failed to update row" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { table: string; rowId: string } }
) {
  try {
    await deleteRow(params.table, params.rowId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      `Failed to delete row ${params.rowId} from ${params.table}`,
      error
    );
    return NextResponse.json(
      { error: "Failed to delete row" },
      { status: 500 }
    );
  }
}
