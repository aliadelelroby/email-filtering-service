import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import FileImport from "@/lib/models/file-import";
import { getJobProgress } from "@/lib/queue";

/**
 * GET handler for retrieving the status of an import
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Ensure params is awaited properly
  const { id: importId } = params;

  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Find the import
    const fileImport = await FileImport.findById(importId);

    if (!fileImport) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    // Get detailed queue job status if available
    let jobProgress = null;
    if (fileImport.queueJobId) {
      try {
        jobProgress = await getJobProgress(
          fileImport.queueJobId,
          "file-processing"
        );
      } catch (error) {
        console.error("Error fetching job progress:", error);
      }
    }

    return NextResponse.json({
      success: true,
      status: fileImport.status,
      import: {
        id: fileImport._id,
        fileName: fileImport.fileName,
        fileSize: fileImport.fileSize,
        status: fileImport.status,
        totalRecords: fileImport.totalRecords,
        processedRecords: fileImport.processedRecords,
        successRecords: fileImport.successRecords,
        errorRecords: fileImport.errorRecords,
        createdAt: fileImport.createdAt,
        completedAt: fileImport.completedAt,
        error: fileImport.error,
      },
      progress: jobProgress ? jobProgress.progress : null,
    });
  } catch (error: any) {
    console.error("Error fetching import status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch import status" },
      { status: 500 }
    );
  }
}
