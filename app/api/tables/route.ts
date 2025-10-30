import { NextResponse } from "next/server";
import { listTables } from "@/utils/tableService";

export async function GET() {
  try {
    const tables = await listTables();
    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Failed to list tables", error);
    return NextResponse.json(
      { error: "Failed to list tables" },
      { status: 500 }
    );
  }
}
