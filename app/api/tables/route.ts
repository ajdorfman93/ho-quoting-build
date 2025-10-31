import { NextRequest, NextResponse } from "next/server";
import { listTables } from "@/utils/tableService";

export async function GET(request: NextRequest) {
  try {
    const projectTag = request.nextUrl.searchParams.get("projectTag") ?? undefined;
    const tables = await listTables(
      projectTag ? { projectTag } : undefined
    );
    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Failed to list tables", error);
    return NextResponse.json(
      { error: "Failed to list tables" },
      { status: 500 }
    );
  }
}
