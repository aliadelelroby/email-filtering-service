import { createReadStream, createWriteStream } from "fs";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import fs from "fs/promises";
import path from "path";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { IExportFilter } from "../models/export";

const CHUNK_SIZE = 5000; // Process records in batches of 5000

/**
 * Base exporter class with common functionality
 */
abstract class BaseExporter {
  protected outputPath: string;
  protected fields: string[];
  protected filters: IExportFilter[];
  protected matchType: "all" | "any";
  protected recordCount: number = 0;

  constructor(
    outputPath: string,
    fields: string[],
    filters: IExportFilter[],
    matchType: "all" | "any"
  ) {
    this.outputPath = outputPath;
    this.fields = fields;
    this.filters = filters;
    this.matchType = matchType;
  }

  /**
   * Convert MongoDB filter conditions to a query object
   */
  protected buildMongoQuery(): Record<string, any> {
    // Early return if no filters
    if (!this.filters.length) return {};

    // Build individual filter conditions
    const conditions = this.filters.map((filter) => {
      switch (filter.operator) {
        case "equals":
          return { [filter.field]: filter.value };
        case "contains":
          return { [filter.field]: { $regex: filter.value, $options: "i" } };
        case "startsWith":
          return {
            [filter.field]: { $regex: `^${filter.value}`, $options: "i" },
          };
        case "endsWith":
          return {
            [filter.field]: { $regex: `${filter.value}$`, $options: "i" },
          };
        case "greaterThan":
          return { [filter.field]: { $gt: filter.value } };
        case "lessThan":
          return { [filter.field]: { $lt: filter.value } };
        case "isEmpty":
          return {
            $or: [
              { [filter.field]: { $exists: false } },
              { [filter.field]: null },
              { [filter.field]: "" },
            ],
          };
        case "isNotEmpty":
          return {
            $and: [
              { [filter.field]: { $exists: true } },
              { [filter.field]: { $ne: null } },
              { [filter.field]: { $ne: "" } },
            ],
          };
        default:
          return {};
      }
    });

    // Combine conditions based on matchType
    return this.matchType === "all"
      ? { $and: conditions }
      : { $or: conditions };
  }

  /**
   * Generate field projection for MongoDB
   */
  protected buildFieldsProjection(): Record<string, number> {
    const projection: Record<string, number> = {};
    this.fields.forEach((field) => {
      projection[field] = 1;
    });
    return projection;
  }

  /**
   * Generate records count from the database
   */
  async getRecordsCount(): Promise<number> {
    const query = this.buildMongoQuery();
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error("MongoDB connection not established");
    }
    const collection = mongoose.connection.db.collection("contacts");
    return await collection.countDocuments(query);
  }

  /**
   * Process export with streaming for efficiency with large datasets
   */
  async export(
    updateProgress: (progress: number) => Promise<void>
  ): Promise<{ filePath: string; recordCount: number; fileSize: number }> {
    // Ensure output directory exists
    const dir = path.dirname(this.outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Get total count for progress calculation
    const totalCount = await this.getRecordsCount();
    let processedCount = 0;

    // Set up MongoDB cursor with query and projection
    const query = this.buildMongoQuery();
    const projection = this.buildFieldsProjection();
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error("MongoDB connection not established");
    }
    const collection = mongoose.connection.db.collection("contacts");
    const cursor = collection.find(query).project(projection);

    // Process export with specific format implementation
    await this.processExport(cursor, async (batchSize) => {
      processedCount += batchSize;
      const progress = Math.min(
        Math.floor((processedCount / totalCount) * 100),
        100
      );
      await updateProgress(progress);
    });

    // Get file stats
    const stats = await fs.stat(this.outputPath);

    return {
      filePath: this.outputPath,
      recordCount: this.recordCount,
      fileSize: stats.size,
    };
  }

  /**
   * Format-specific export implementation (to be implemented by subclasses)
   */
  protected abstract processExport(
    cursor: any,
    onBatch: (batchSize: number) => Promise<void>
  ): Promise<void>;
}

/**
 * CSV Exporter implementation
 */
class CsvExporter extends BaseExporter {
  protected async processExport(
    cursor: any,
    onBatch: (batchSize: number) => Promise<void>
  ): Promise<void> {
    const writeStream = createWriteStream(this.outputPath);

    // Write CSV header
    writeStream.write(this.fields.join(",") + "\n");

    // Create transform stream to convert records to CSV
    const transformToCSV = new Transform({
      objectMode: true,
      transform: (chunk, encoding, callback) => {
        const csvLine = this.fields
          .map((field) => {
            const value = chunk[field];
            // Handle different value types and ensure proper CSV escaping
            if (value === undefined || value === null) return "";
            if (typeof value === "string") {
              // Escape quotes and wrap with quotes if needed
              if (
                value.includes(",") ||
                value.includes('"') ||
                value.includes("\n")
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }
            return String(value);
          })
          .join(",");
        this.recordCount++;
        callback(null, csvLine + "\n");
      },
    });

    // Process in batches
    let batch: any[] = [];
    let currentBatchSize = 0;

    try {
      await cursor.forEach((doc: any) => {
        batch.push(doc);
        currentBatchSize++;

        if (currentBatchSize >= CHUNK_SIZE) {
          // Process batch
          for (const record of batch) {
            transformToCSV.write(record);
          }

          // Report progress and reset batch
          onBatch(currentBatchSize);
          batch = [];
          currentBatchSize = 0;
        }
      });

      // Process any remaining records
      if (batch.length > 0) {
        for (const record of batch) {
          transformToCSV.write(record);
        }
        onBatch(currentBatchSize);
      }

      // End the transform stream
      transformToCSV.end();

      // Pipe transform stream to file
      transformToCSV.pipe(writeStream);

      // Wait for the pipeline to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    } finally {
      // Ensure streams are closed
      transformToCSV.destroy();
      writeStream.end();
    }
  }
}

/**
 * JSON Exporter implementation
 */
class JsonExporter extends BaseExporter {
  protected async processExport(
    cursor: any,
    onBatch: (batchSize: number) => Promise<void>
  ): Promise<void> {
    const writeStream = createWriteStream(this.outputPath);

    // Start JSON array
    writeStream.write("[\n");

    let isFirstRecord = true;
    let batch: any[] = [];
    let currentBatchSize = 0;

    try {
      await cursor.forEach((doc: any) => {
        // Create an object with only selected fields
        const record: Record<string, any> = {};
        this.fields.forEach((field) => {
          record[field] = doc[field];
        });

        batch.push(record);
        currentBatchSize++;

        if (currentBatchSize >= CHUNK_SIZE) {
          // Process batch
          for (const record of batch) {
            // Add comma separator between records
            if (!isFirstRecord) {
              writeStream.write(",\n");
            }
            isFirstRecord = false;

            // Write JSON record
            writeStream.write(JSON.stringify(record, null, 2));
            this.recordCount++;
          }

          // Report progress and reset batch
          onBatch(currentBatchSize);
          batch = [];
          currentBatchSize = 0;
        }
      });

      // Process any remaining records
      if (batch.length > 0) {
        for (const record of batch) {
          if (!isFirstRecord) {
            writeStream.write(",\n");
          }
          isFirstRecord = false;

          writeStream.write(JSON.stringify(record, null, 2));
          this.recordCount++;
        }
        onBatch(currentBatchSize);
      }

      // Close JSON array
      writeStream.write("\n]");
      writeStream.end();

      // Wait for the pipeline to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    } finally {
      writeStream.end();
    }
  }
}

/**
 * TXT Exporter implementation (simple text format)
 */
class TxtExporter extends BaseExporter {
  protected async processExport(
    cursor: any,
    onBatch: (batchSize: number) => Promise<void>
  ): Promise<void> {
    const writeStream = createWriteStream(this.outputPath);

    // Write header
    writeStream.write(this.fields.join("\t") + "\n");

    let batch: any[] = [];
    let currentBatchSize = 0;

    try {
      await cursor.forEach((doc: any) => {
        batch.push(doc);
        currentBatchSize++;

        if (currentBatchSize >= CHUNK_SIZE) {
          // Process batch
          for (const record of batch) {
            const line = this.fields
              .map((field) => {
                const value = record[field];
                if (value === undefined || value === null) return "";
                return String(value).replace(/\t/g, " "); // Replace tabs with spaces
              })
              .join("\t");

            writeStream.write(line + "\n");
            this.recordCount++;
          }

          // Report progress and reset batch
          onBatch(currentBatchSize);
          batch = [];
          currentBatchSize = 0;
        }
      });

      // Process any remaining records
      if (batch.length > 0) {
        for (const record of batch) {
          const line = this.fields
            .map((field) => {
              const value = record[field];
              if (value === undefined || value === null) return "";
              return String(value).replace(/\t/g, " "); // Replace tabs with spaces
            })
            .join("\t");

          writeStream.write(line + "\n");
          this.recordCount++;
        }
        onBatch(currentBatchSize);
      }

      writeStream.end();

      // Wait for the pipeline to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    } finally {
      writeStream.end();
    }
  }
}

/**
 * Factory function to create appropriate exporter based on format
 */
export function createExporter(
  format: "csv" | "json" | "txt",
  outputPath: string,
  fields: string[],
  filters: IExportFilter[],
  matchType: "all" | "any"
): BaseExporter {
  switch (format) {
    case "json":
      return new JsonExporter(outputPath, fields, filters, matchType);
    case "txt":
      return new TxtExporter(outputPath, fields, filters, matchType);
    case "csv":
    default:
      return new CsvExporter(outputPath, fields, filters, matchType);
  }
}
