import { NextResponse } from "next/server";
import { createColumn } from "@/utils/tableService";

export async function POST(
  request: Request,
  { params }: { params: { table: string } }
) {
  try {
    const payload = await request.json();
    const column = await createColumn(params.table, {
      name: payload?.name,
      type: payload?.type,
      config: payload?.config ?? {},
      width: payload?.width,
      position: payload?.position,
      clientKey: payload?.clientKey,
    });

    return NextResponse.json({ column });
  } catch (error) {
    console.error(`Failed to create column on ${params.table}`, error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}
