import { NextResponse } from "next/server";
import { getTableData } from "@/utils/tableService";

export async function GET(
  request: Request,
  { params }: { params: { table: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? Number.parseInt(offsetParam, 10) : undefined;

    const data = await getTableData(params.table, { limit, offset });
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Failed to load table ${params.table}`, error);
    return NextResponse.json(
      { error: `Failed to load table ${params.table}` },
      { status: 500 }
    );
  }
}
