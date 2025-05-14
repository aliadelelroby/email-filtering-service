import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Export from "@/lib/models/export";
import fs from "fs/promises";
import path from "path";

// Download the export file
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Connect to database to get export file info
    await connectToDatabase();

    // Find the export by ID
    const exportJob = await Export.findById(id).lean();

    // Type guard to ensure we have an object
    if (!exportJob || typeof exportJob !== "object") {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    // Access properties safely after type guard
    const status = exportJob.status;
    const filePath = exportJob.filePath as string | undefined;
    const format = exportJob.format as string;

    // Check if export is complete and has file path
    if (status !== "completed" || !filePath) {
      return NextResponse.json(
        { error: "Export is not ready for download" },
        { status: 400 }
      );
    }

    try {
      // Check if file exists
      await fs.access(filePath);

      // Read file
      const fileBuffer = await fs.readFile(filePath);

      // Determine content type
      let contentType = "text/plain";
      switch (format) {
        case "csv":
          contentType = "text/csv";
          break;
        case "json":
          contentType = "application/json";
          break;
      }

      // Get file name from path
      const fileName = path.basename(filePath);

      // Return file as downloadable response
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    } catch (fileError) {
      return NextResponse.json(
        { error: "Export file not found on server" },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("Export download error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
