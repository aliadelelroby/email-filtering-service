import path from "path";
import { connectToDatabase } from "./mongodb";
import { exportQueue } from "./queue";
import Export, { IExportFilter } from "./models/export";
import { createExporter } from "./exporters";
import * as fs from "fs/promises";

// Ensure this code only runs on server-side
if (typeof window === "undefined" && exportQueue) {
  try {
    // Set up the export processor for Bull queue
    exportQueue.process(async (job) => {
      const { exportId } = job.data;

      try {
        // Connect to database
        await connectToDatabase();

        // Find the export job
        const exportJob = await Export.findById(exportId);
        if (!exportJob) {
          throw new Error(`Export job with ID ${exportId} not found`);
        }

        // Update status to processing
        exportJob.status = "processing";
        await exportJob.save();

        // Create output directory structure
        const outputDir = path.join(
          process.cwd(),
          process.env.EXPORT_FILE_DIR || "exports",
          exportJob._id.toString()
        );
        await fs.mkdir(outputDir, { recursive: true });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/:/g, "-");
        const filename = `export_${exportJob.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_${timestamp}.${exportJob.format}`;
        const outputPath = path.join(outputDir, filename);

        // Create appropriate exporter
        const exporter = createExporter(
          exportJob.format,
          outputPath,
          exportJob.selectedFields,
          exportJob.filters as IExportFilter[],
          exportJob.matchType
        );

        // Start export with progress updates
        const result = await exporter.export(async (progress) => {
          // Update job progress
          await job.progress(progress);

          // Also update MongoDB document with progress data
          if (progress % 10 === 0) {
            // Update every 10% to reduce DB writes
            await Export.findByIdAndUpdate(exportJob._id, {
              status: "processing",
              progress,
            });
          }
        });

        // Update export job with completed status and results
        exportJob.status = "completed";
        exportJob.filePath = outputPath;
        exportJob.fileSize = (await fs.stat(outputPath)).size;
        exportJob.recordCount = result.recordCount;
        exportJob.completedAt = new Date();
        await exportJob.save();

        return {
          recordCount: result.recordCount,
          filePath: outputPath,
        };
      } catch (error: any) {
        console.error(`Export job ${exportId} failed:`, error);

        // Update job with error status
        await Export.findByIdAndUpdate(exportId, {
          status: "failed",
          error: error.message || "Unknown error during export",
        });

        throw error; // Re-throw to let Bull handle the failure
      }
    });

    // Add handlers for job events
    exportQueue.on("completed", async (job) => {
      console.log(`Export job ${job.data.exportId} completed successfully`);
    });

    exportQueue.on("failed", async (job, error) => {
      console.error(`Export job ${job.data.exportId} failed:`, error);
    });

    exportQueue.on("stalled", async (job) => {
      console.warn(`Export job ${job.data.exportId} stalled`);
    });
  } catch (error) {
    console.error("Error setting up export processor:", error);
  }
}

// Clean up function to remove old export files (can be called periodically)
export async function cleanupOldExports(
  daysToKeep = process.env.EXPORT_CLEANUP_DAYS
    ? parseInt(process.env.EXPORT_CLEANUP_DAYS)
    : 7
) {
  const exportsDir = path.join(
    process.cwd(),
    process.env.EXPORT_FILE_DIR || "exports"
  );

  try {
    const subdirectories = await fs.readdir(exportsDir);
    const now = new Date();

    for (const subdirectory of subdirectories) {
      const dirPath = path.join(exportsDir, subdirectory);
      const stats = await fs.stat(dirPath);

      if (stats.isDirectory()) {
        // Calculate if directory is older than threshold
        const dirDate = new Date(stats.mtime);
        const diffDays =
          (now.getTime() - dirDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays > daysToKeep) {
          await fs.rm(dirPath, { recursive: true, force: true });
          console.log(`Removed old export directory: ${subdirectory}`);
        }
      }
    }
  } catch (error) {
    console.error("Error cleaning up old exports:", error);
  }
}
