import { NextResponse } from "next/server";
import { createRow } from "@/utils/tableService";

export async function POST(
  request: Request,
  { params }: { params: { table: string } }
) {
  try {
    const payload = await request.json();
    const row = await createRow(params.table, payload?.values ?? {});
    return NextResponse.json({ row });
  } catch (error) {
    console.error(`Failed to create row in ${params.table}`, error);
    return NextResponse.json(
      { error: "Failed to create row" },
      { status: 500 }
    );
  }
}
