import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Export from "@/lib/models/export";
import fs from "fs/promises";
import path from "path";
import { getExport, deleteExport } from "@/lib/actions/export-actions";

// Get a single export by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await getExport(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Export not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      export: result.export,
    });
  } catch (error: any) {
    console.error("Export retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete a specific export
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await deleteExport(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Export deletion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Download the export file
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (new URL(req.url).pathname.endsWith("/download")) {
    try {
      const { id } = params;

      // Connect to database to get export file info
      await connectToDatabase();

      // Find the export
      const exportJob = await Export.findById(id).lean();

      if (!exportJob) {
        return NextResponse.json(
          { error: "Export not found" },
          { status: 404 }
        );
      }

      if (exportJob.status !== "completed" || !exportJob.filePath) {
        return NextResponse.json(
          { error: "Export is not ready for download" },
          { status: 400 }
        );
      }

      try {
        // Check if file exists
        await fs.access(exportJob.filePath);

        // Read file
        const fileBuffer = await fs.readFile(exportJob.filePath);

        // Determine content type
        let contentType = "text/plain";
        switch (exportJob.format) {
          case "csv":
            contentType = "text/csv";
            break;
          case "json":
            contentType = "application/json";
            break;
        }

        // Get file name from path
        const fileName = path.basename(exportJob.filePath);

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
}
