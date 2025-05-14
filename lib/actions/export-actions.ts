"use server";

import { connectToDatabase } from "@/lib/mongodb";
import Export, { IExport } from "@/lib/models/export";
import { addExportJob, getJobProgress } from "@/lib/queue";
import { revalidatePath } from "next/cache";
import { Document, FlattenMaps, Types } from "mongoose";

/**
 * Creates a new export job
 */
export async function createExport(data: {
  name: string;
  format: "csv" | "json" | "txt";
  filters: Array<{ field: string; operator: string; value: string }>;
  matchType: "all" | "any";
  selectedFields: string[];
}) {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    const { name, format, filters, matchType, selectedFields } = data;

    // Validate required fields
    if (!name || !format || !selectedFields || !selectedFields.length) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    // Validate format
    if (!["csv", "json", "txt"].includes(format)) {
      return {
        success: false,
        error: "Invalid format. Must be csv, json, or txt",
      };
    }

    // Create the export job in MongoDB
    const exportJob = await Export.create({
      name,
      format,
      filters: filters || [],
      matchType: matchType || "all",
      selectedFields,
      status: "pending",
    });

    // Add job to the queue
    const bullJob = await addExportJob({
      exportId: exportJob._id.toString(),
    });

    // Update the export job with the queue job ID
    await Export.findByIdAndUpdate(exportJob._id, {
      queueJobId: bullJob.id.toString(),
    });

    return {
      success: true,
      export: {
        id: exportJob._id,
        name: exportJob.name,
        status: exportJob.status,
        queueJobId: bullJob.id,
      },
    };
  } catch (error: any) {
    console.error("Export creation error:", error);
    return {
      success: false,
      error: error.message || "Failed to create export",
    };
  }
}

// Type for lean export document
type ExportDocument = FlattenMaps<IExport> & {
  _id: Types.ObjectId;
  progress?: number;
  queueJobId?: string;
};

/**
 * Gets all export jobs
 */
export async function getExports() {
  try {
    await connectToDatabase();

    const exports = (await Export.find()
      .sort({ createdAt: -1 })
      .lean()) as ExportDocument[];

    // Add progress information from queue if available
    const exportsWithProgress = await Promise.all(
      exports.map(async (exportJob) => {
        let progress = exportJob.progress || 0;

        // Only check progress for pending/processing jobs
        if (
          (exportJob.status === "pending" ||
            exportJob.status === "processing") &&
          exportJob.queueJobId
        ) {
          const jobInfo = await getJobProgress(exportJob.queueJobId);
          if (jobInfo && typeof jobInfo.progress === "number") {
            progress = jobInfo.progress;
          }
        }

        return {
          ...exportJob,
          progress,
        };
      })
    );

    return {
      success: true,
      exports: exportsWithProgress,
    };
  } catch (error: any) {
    console.error("Error fetching exports:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch exports",
      exports: [],
    };
  }
}

/**
 * Gets a single export by ID
 */
export async function getExport(id: string) {
  try {
    await connectToDatabase();

    const exportJob = (await Export.findById(
      id
    ).lean()) as ExportDocument | null;

    if (!exportJob) {
      return {
        success: false,
        error: "Export not found",
      };
    }

    // Get queue job progress if available
    let progress = exportJob.progress || 0;

    if (exportJob.queueJobId) {
      const queueJobInfo = await getJobProgress(exportJob.queueJobId);
      if (queueJobInfo && typeof queueJobInfo.progress === "number") {
        progress = queueJobInfo.progress;
      }
    }

    return {
      success: true,
      export: {
        ...exportJob,
        progress,
      },
    };
  } catch (error: any) {
    console.error("Error fetching export:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch export",
    };
  }
}

/**
 * Deletes an export by ID
 */
export async function deleteExport(id: string) {
  try {
    await connectToDatabase();

    await Export.findByIdAndDelete(id);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting export:", error);
    return {
      success: false,
      error: error.message || "Failed to delete export",
    };
  }
}
