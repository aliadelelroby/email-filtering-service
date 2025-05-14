import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Export from "@/lib/models/export";
import { addExportJob, getJobProgress } from "@/lib/queue";
import fs from "fs/promises";
import path from "path";
import { getExports, createExport } from "@/lib/actions/export-actions";

// Create a new export job
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { name, format, filters, matchType, selectedFields } = body;

    // Use the server action to create the export
    const result = await createExport({
      name,
      format,
      filters,
      matchType,
      selectedFields,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      export: result.export,
    });
  } catch (error: any) {
    console.error("Export creation API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all exports
export async function GET(req: NextRequest) {
  try {
    const result = await getExports();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      exports: result.exports,
    });
  } catch (error: any) {
    console.error("Exports API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
