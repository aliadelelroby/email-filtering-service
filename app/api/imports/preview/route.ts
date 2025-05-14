import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import crypto from "crypto";

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Save file from request stream to disk
 */
async function saveFileToDisk(request: NextRequest): Promise<{
  filePath: string;
  fileName: string;
  fileSize: number;
}> {
  // Create a temporary directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), "uploads", "temp");
  await mkdir(uploadDir, { recursive: true });

  // Get the FormData from the request
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("No file provided");
  }

  // Extract file extension from the original filename
  const fileExt = path.extname(file.name);

  // Generate a unique file name with the original extension
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(16).toString("hex");
  const tempFileName = `upload_${timestamp}_${randomId}${fileExt}`;
  const filePath = path.join(uploadDir, tempFileName);

  // Convert the File to an ArrayBuffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Write the file to disk
  await writeFile(filePath, buffer);

  return {
    filePath,
    fileName: file.name,
    fileSize: file.size,
  };
}

/**
 * Detect fields and preview data from a file
 * @param filePath Path to the uploaded file
 * @param fileName Original file name
 * @param maxRows Maximum number of rows to preview
 */
async function detectFieldsAndPreview(
  filePath: string,
  fileName: string,
  maxRows: number = 5
): Promise<{ fields: string[]; preview: Record<string, any>[] }> {
  const fileExt = path.extname(fileName).toLowerCase();
  let fields: string[] = [];
  let preview: Record<string, any>[] = [];

  if (fileExt === ".csv" || fileExt === ".txt") {
    // Handle CSV/TXT files
    const fileContent = fs.readFileSync(filePath, "utf8");
    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      preview: maxRows,
    });

    fields = results.meta.fields || [];
    preview = results.data as Record<string, any>[];
  } else if (fileExt === ".xlsx" || fileExt === ".xls") {
    // Handle Excel files
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert Excel to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    if (data.length > 0) {
      // First row is headers
      fields = (data[0] as any[]).map((header) => String(header));

      // Convert rows to objects
      for (let i = 1; i < Math.min(data.length, maxRows + 1); i++) {
        const rowData = data[i] as any[];
        const rowObj: Record<string, any> = {};

        fields.forEach((field, idx) => {
          rowObj[field] = rowData[idx] !== undefined ? rowData[idx] : "";
        });

        preview.push(rowObj);
      }
    }
  }

  return { fields, preview };
}

/**
 * POST handler for previewing file contents
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Save uploaded file to disk
    const { filePath, fileName, fileSize } = await saveFileToDisk(req);

    // Extract fields and preview data
    const { fields, preview } = await detectFieldsAndPreview(
      filePath,
      fileName
    );

    // Generate a unique fileId for later reference
    const fileId = path.basename(filePath);

    // We'll keep the file for the import step instead of deleting it
    // This way the import endpoint can access it

    return NextResponse.json({
      success: true,
      fields,
      preview,
      fileName,
      fileSize,
      fileId,
    });
  } catch (error: any) {
    console.error("File preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process file" },
      { status: 500 }
    );
  }
}
