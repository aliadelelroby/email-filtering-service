import { mkdir, readdir, unlink, appendFile, readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import FileImport from "@/lib/models/file-import";
import { addFileProcessingJob } from "@/lib/queue";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

/**
 * Handler for file uploads with support for both direct uploads and chunked uploads
 */
export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();

    const formData = await req.formData();

    // Check if this is a chunked upload
    const chunkIndex = formData.get("chunkIndex");
    const totalChunks = formData.get("totalChunks");
    const fileId = formData.get("fileId");

    // Chunked upload
    if (chunkIndex !== null && totalChunks !== null && fileId) {
      return handleChunk(formData);
    }

    // Regular upload (small files)
    return handleCompleteFile(formData);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handles a single chunk of a larger file
 * @param formData The formData containing chunk information
 */
async function handleChunk(formData: FormData) {
  const chunkIndex = Number(formData.get("chunkIndex"));
  const totalChunks = Number(formData.get("totalChunks"));
  const fileId = formData.get("fileId") as string;
  const originalFileName = formData.get("fileName") as string;
  const fileType = formData.get("fileType") as string;
  const totalFileSize = Number(formData.get("totalFileSize") || 0);
  const chunk = formData.get("chunk") as File;

  if (!chunk) {
    return NextResponse.json(
      { error: "No chunk data provided" },
      { status: 400 }
    );
  }

  // Validate the file type
  const validTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  if (
    !validTypes.includes(fileType) &&
    !originalFileName.match(/\.(csv|xlsx|xls|txt)$/i)
  ) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Create directories if they don't exist
  const uploadDir = path.join(process.cwd(), "uploads");
  const chunksDir = path.join(uploadDir, "chunks", fileId);
  await mkdir(chunksDir, { recursive: true });

  // Save the chunk
  const chunkPath = path.join(chunksDir, `chunk-${chunkIndex}`);
  const arrayBuffer = await chunk.arrayBuffer();
  await writeChunk(chunkPath, arrayBuffer);

  // Check if we have all chunks
  const chunks = await readdir(chunksDir);

  // If all chunks received, combine them
  if (chunks.length === totalChunks) {
    const fileName = `${path.parse(originalFileName).name}-${fileId.substring(
      0,
      8
    )}${path.extname(originalFileName)}`;
    const finalFilePath = path.join(uploadDir, fileName);

    try {
      await combineChunks(chunksDir, finalFilePath, totalChunks);

      // Create a record in the database
      const fileImport = await FileImport.create({
        fileName: originalFileName,
        fileSize: totalFileSize,
        fileType: fileType || path.extname(originalFileName).slice(1),
        status: "pending",
        storedAs: fileName,
      });

      // Add to Bull queue for background processing
      const job = await addFileProcessingJob({
        fileImportId: fileImport._id.toString(),
        filePath: finalFilePath,
      });

      // Update the file import with the queue job ID
      await FileImport.findByIdAndUpdate(fileImport._id, {
        queueJobId: job.id.toString(),
      });

      // Clean up chunks
      await cleanupChunksDirectory(chunksDir);

      return NextResponse.json({
        success: true,
        fileImport: {
          id: fileImport._id,
          fileName: fileImport.fileName,
          status: fileImport.status,
        },
        finalizing: true,
      });
    } catch (error) {
      console.error("Error combining chunks:", error);
      return NextResponse.json(
        { error: "Error combining file chunks" },
        { status: 500 }
      );
    }
  }

  // Report current progress
  return NextResponse.json({
    success: true,
    progress: {
      chunkIndex,
      totalChunks,
      progress: Math.round((chunks.length / totalChunks) * 100),
    },
  });
}

/**
 * Writes a chunk to disk
 * @param filePath The path to save the chunk to
 * @param data The chunk data as ArrayBuffer
 */
async function writeChunk(filePath: string, data: ArrayBuffer): Promise<void> {
  return appendFile(filePath, Buffer.from(data));
}

/**
 * Combines file chunks into a complete file
 * @param chunksDir The directory containing the chunks
 * @param outputPath The path to save the complete file
 * @param totalChunks The total number of chunks
 */
async function combineChunks(
  chunksDir: string,
  outputPath: string,
  totalChunks: number
): Promise<void> {
  // Make sure output doesn't exist yet
  if (fs.existsSync(outputPath)) {
    await unlink(outputPath);
  }

  // Process chunks sequentially to maintain order
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunksDir, `chunk-${i}`);

    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Missing chunk ${i}`);
    }

    const chunkData = await readFile(chunkPath);
    await appendFile(outputPath, chunkData);
  }
}

/**
 * Cleans up the chunks directory after a successful file combination
 * @param chunksDir The directory containing the chunks
 */
async function cleanupChunksDirectory(chunksDir: string): Promise<void> {
  try {
    const files = await readdir(chunksDir);
    await Promise.all(files.map((file) => unlink(path.join(chunksDir, file))));
    // Remove the chunks directory - use fs.rmdir since directories can't be unlinked
    await fs.promises.rmdir(chunksDir);
  } catch (error) {
    console.error("Error cleaning up chunks directory:", error);
    // Non-fatal error, can be cleaned up later
  }
}

/**
 * Handles a complete file upload (small files that don't need chunking)
 * @param formData The formData containing the file
 */
async function handleCompleteFile(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Check file type
  const validTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  if (
    !validTypes.includes(file.type) &&
    !file.name.match(/\.(csv|xlsx|xls|txt)$/i)
  ) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Create directories if they don't exist
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });

  // Generate a unique filename to prevent collisions
  const fileHash = createHash("md5")
    .update(file.name + Date.now().toString())
    .digest("hex")
    .substring(0, 8);

  const fileName = `${path.parse(file.name).name}-${fileHash}${path.extname(
    file.name
  )}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    // Write the file in chunks to avoid memory issues
    const arrayBuffer = await file.arrayBuffer();
    await appendFile(filePath, Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Error writing file:", error);
    return NextResponse.json({ error: "Error saving file" }, { status: 500 });
  }

  // Create a record in the database
  const fileImport = await FileImport.create({
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || path.extname(file.name).slice(1),
    status: "pending",
    storedAs: fileName,
  });

  // Add to Bull queue for background processing
  const job = await addFileProcessingJob({
    fileImportId: fileImport._id.toString(),
    filePath,
  });

  // Update the file import with the queue job ID
  await FileImport.findByIdAndUpdate(fileImport._id, {
    queueJobId: job.id.toString(),
  });

  return NextResponse.json({
    success: true,
    fileImport: {
      id: fileImport._id,
      fileName: fileImport.fileName,
      status: fileImport.status,
    },
  });
}
