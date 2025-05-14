import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import FileImport from "@/lib/models/file-import";
import { addFileProcessingJob } from "@/lib/queue";
import fs from "fs";
import path from "path";
import { mkdir } from "fs/promises";

/**
 * GET handler for fetching all imports
 */
export async function GET(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Fetch all file imports, sorted by most recent first
    const imports = await FileImport.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ imports });
  } catch (error: any) {
    console.error("Error fetching imports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch imports" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new import with field mapping
 */
export async function POST(req: NextRequest) {
  try {
    // Parse JSON body
    const body = await req.json();
    const { fileName, fileSize, fieldMapping, fileId } = body;

    // Validate request data
    if (!fileName || !fieldMapping || !fileId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Create the file import record
    const fileImport = await FileImport.create({
      fileName,
      fileSize: fileSize || 0,
      fileType: path.extname(fileName).slice(1) || "unknown",
      status: "pending",
      fieldMapping: new Map(Object.entries(fieldMapping)), // Convert to Map for MongoDB
      uploadedBy: req.headers.get("x-user-id") || "anonymous",
      createdAt: new Date(),
    });

    // Determine file path - file should be in the temp directory from the preview step
    const tempFilePath = path.join(process.cwd(), "uploads", "temp", fileId);

    // Check if the file exists
    if (!fs.existsSync(tempFilePath)) {
      // Try to find the file with original extension in case fileId doesn't include it
      const fileExt = path.extname(fileName);
      const tempFilePathWithExt = path.join(
        process.cwd(),
        "uploads",
        "temp",
        fileId + fileExt
      );

      if (!fs.existsSync(tempFilePathWithExt)) {
        await FileImport.findByIdAndUpdate(fileImport._id, {
          status: "failed",
          error: "File not found in storage",
        });

        return NextResponse.json(
          { error: "Preview file not found. Please try uploading again." },
          { status: 400 }
        );
      }

      // Found file with extension
      const storedDir = path.join(process.cwd(), "uploads", "imports");
      await mkdir(storedDir, { recursive: true });

      const storedFileName = `${Date.now()}-${fileImport._id}${fileExt}`;
      const storedFilePath = path.join(storedDir, storedFileName);

      // Copy the temp file with extension to permanent storage
      fs.copyFileSync(tempFilePathWithExt, storedFilePath);

      // Delete the temporary file after copying it
      try {
        fs.unlinkSync(tempFilePathWithExt);
      } catch (error) {
        console.error("Failed to delete temp file:", error);
      }

      // Add the processing job to the queue
      const job = await addFileProcessingJob({
        fileImportId: fileImport._id.toString(),
        filePath: storedFilePath,
        fieldMapping,
      });

      // Update import record with job ID and stored file name
      await FileImport.findByIdAndUpdate(fileImport._id, {
        queueJobId: job.id.toString(),
        storedAs: storedFileName,
      });

      return NextResponse.json({
        success: true,
        importId: fileImport._id.toString(),
        status: "pending",
        message: "Import job added to queue",
      });
    }

    // Original code path - file found without extension
    const storageDir = path.join(process.cwd(), "uploads", "imports");
    await mkdir(storageDir, { recursive: true });

    const storedFileName = `${Date.now()}-${fileImport._id}${path.extname(
      fileName
    )}`;
    const storedFilePath = path.join(storageDir, storedFileName);

    // Create a read stream from the temp file
    fs.copyFileSync(tempFilePath, storedFilePath);

    // Delete the temporary file after copying it
    try {
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      console.error("Failed to delete temp file:", error);
    }

    // Add the processing job to the queue
    const job = await addFileProcessingJob({
      fileImportId: fileImport._id.toString(),
      filePath: storedFilePath,
      fieldMapping,
    });

    // Update import record with job ID and stored file name
    await FileImport.findByIdAndUpdate(fileImport._id, {
      queueJobId: job.id.toString(),
      storedAs: storedFileName,
    });

    return NextResponse.json({
      success: true,
      importId: fileImport._id.toString(),
      status: "pending",
      message: "Import job added to queue",
    });
  } catch (error: any) {
    console.error("Error creating import:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create import" },
      { status: 500 }
    );
  }
}
