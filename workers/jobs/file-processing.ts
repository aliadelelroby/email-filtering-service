import Bull, { Job } from "bull";
import { connectToDatabase } from "@/lib/mongodb";
import FileImport from "@/lib/models/file-import";
import Contact from "@/lib/models/contact";
import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";
import xlsx from "xlsx";
import { QUEUE_NAMES } from "@/lib/queue";

const getRedisConfig = () => ({
  redis: {
    port: parseInt(process.env.REDIS_PORT || "6379"),
    host: process.env.REDIS_HOST || "localhost",
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  },
});

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: true,
  timeout: 30 * 60 * 1000,
};

const fileProcessingQueue = new Bull(QUEUE_NAMES.FILE_PROCESSING, {
  ...getRedisConfig(),
  defaultJobOptions,
  settings: {
    stalledInterval: 60000,
    maxStalledCount: 2,
  },
});

interface FileProcessingJob {
  fileImportId: string;
  filePath: string;
  fieldMapping?: Record<string, string>;
}

async function processFileImport(job: Job<FileProcessingJob>) {
  const { fileImportId, filePath, fieldMapping = {} } = job.data;

  try {
    await connectToDatabase();

    const fileImport = await FileImport.findById(fileImportId);
    if (!fileImport) {
      throw new Error(`File import with ID ${fileImportId} not found`);
    }

    fileImport.status = "processing";
    await fileImport.save();

    const fileContent = await fs.readFile(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    let records: Record<string, any>[] = [];
    let headers: string[] = [];

    await job.progress(5);

    if (fileExt === ".csv" || fileExt === ".txt") {
      const content = fileContent.toString();
      const results = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
      });
      headers = results.meta.fields || [];
      records = results.data as Record<string, any>[];
    } else if (fileExt === ".xlsx" || fileExt === ".xls") {
      const workbook = xlsx.read(fileContent, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      records = xlsx.utils.sheet_to_json(worksheet);
      if (records.length > 0) {
        headers = Object.keys(records[0]);
      }
    } else {
      throw new Error("Unsupported file format");
    }

    await job.progress(20);

    const mappings =
      fieldMapping ||
      (fileImport.fieldMapping
        ? Object.fromEntries(fileImport.fieldMapping.entries())
        : {});

    let validRecords = 0;
    let errorRecords = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const errors: { line: number; message: string }[] = [];

    const totalRecords = records.length;
    const batchSize = 1000;
    const totalBatches = Math.ceil(totalRecords / batchSize);
    const mappedRecords: Record<string, any>[] = [];

    /**
     * Extracts a valid email from various formats
     */
    const extractEmail = (input: any): string | null => {
      if (!input) return null;

      if (typeof input === "string") {
        // If it's already a simple email string
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
          return input;
        }

        // Try to parse JSON-like string
        try {
          // Handle array-like structure with objects
          if (input.startsWith("[{")) {
            // Use regex to extract email addresses
            const emailMatches = input.match(
              /['"]address['"]:\s*['"]([^'"]+@[^'"]+\.[^'"]+)['"]/g
            );
            if (emailMatches && emailMatches.length > 0) {
              // Extract the first email address
              const firstEmailMatch = emailMatches[0].match(
                /['"]address['"]:\s*['"]([^'"]+@[^'"]+\.[^'"]+)['"]/
              );
              if (firstEmailMatch && firstEmailMatch[1]) {
                return firstEmailMatch[1];
              }
            }
          }
        } catch (e) {
          // If parsing fails, return null
          return null;
        }
      }

      return null;
    };

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, totalRecords);
      const batch = records.slice(startIdx, endIdx);

      batch.forEach((record, idx) => {
        const lineNumber = startIdx + idx + 1;
        const mappedRecord: Record<string, any> = {};
        let hasEmail = false;
        let emailValue = null;

        for (const [sourceField, systemField] of Object.entries(mappings)) {
          if (record[sourceField] !== undefined) {
            // Handle email field specially
            if (systemField === "email") {
              emailValue = extractEmail(record[sourceField]);
              if (emailValue) {
                mappedRecord[systemField] = emailValue;
                hasEmail = true;
              } else {
                errors.push({
                  line: lineNumber,
                  message: `Could not extract valid email from: "${record[sourceField]}"`,
                });
              }
            } else {
              mappedRecord[systemField] = record[sourceField];
            }
          }
        }

        if (!hasEmail) {
          // Check if work_email exists and can be used instead
          if (record["work_email"]) {
            emailValue = extractEmail(record["work_email"]);
            if (emailValue) {
              mappedRecord["email"] = emailValue;
              hasEmail = true;
            }
          }

          if (!hasEmail) {
            errorRecords++;
            if (!errors.some((e) => e.line === lineNumber)) {
              errors.push({
                line: lineNumber,
                message: "Missing or invalid email address",
              });
            }
          }
        }

        if (hasEmail) {
          validRecords++;
          mappedRecords.push(mappedRecord);
        }
      });

      const progressPercentage = Math.round(
        20 + ((batchIndex + 1) / totalBatches) * 50
      );
      await job.progress(progressPercentage);
    }

    if (mappedRecords.length > 0) {
      for (let i = 0; i < mappedRecords.length; i += batchSize) {
        const contactBatch = mappedRecords.slice(i, i + batchSize);
        const operations = contactBatch.map((contact) => {
          // Default values for fields that might be mapped
          const contactData = {
            // Required field
            email: contact.email,

            // Basic contact info
            firstName: contact.firstName || contact.first_name || "",
            lastName: contact.lastName || contact.last_name || "",
            status: contact.status || "active",
            tags: contact.tags || [],

            // Professional info
            jobTitle:
              contact.jobTitle || contact.job_title || contact.title || "",
            seniority: contact.seniority || contact.level || "",
            department: contact.department || "",

            // Company info
            company:
              contact.company ||
              contact.organization ||
              contact.companyName ||
              "",
            companyWebsite:
              contact.companyWebsite ||
              contact.company_website ||
              contact.website ||
              "",
            companySize: contact.companySize || contact.company_size || "",
            industry: contact.industry || "",

            // Additional contact info
            phone:
              contact.phone ||
              contact.phoneNumber ||
              contact.phone_number ||
              "",
            linkedinUrl:
              contact.linkedinUrl ||
              contact.linkedin ||
              contact.linkedin_url ||
              "",
            twitterHandle:
              contact.twitterHandle ||
              contact.twitter ||
              contact.twitter_handle ||
              "",

            // Location info
            country: contact.country || "",
            city: contact.city || "",
            state: contact.state || "",

            // Use custom fields for any other mapped fields
            customFields: {} as Record<string, any>,
          };

          // Add any other fields to customFields
          Object.keys(contact).forEach((key) => {
            if (
              !Object.keys(contactData).includes(key) &&
              key !== "customFields"
            ) {
              (contactData.customFields as Record<string, any>)[key] =
                contact[key];
            }
          });

          return {
            updateOne: {
              filter: { email: contact.email },
              update: {
                $set: contactData,
              },
              upsert: true,
            },
          };
        });

        if (operations.length > 0) {
          const bulkResult = await Contact.bulkWrite(operations);
          createdCount += bulkResult.upsertedCount || 0;
          updatedCount += bulkResult.modifiedCount || 0;
        }

        const saveProgressPercentage = Math.round(
          70 + ((i + contactBatch.length) / mappedRecords.length) * 25
        );
        await job.progress(saveProgressPercentage);
      }
    }

    await FileImport.findByIdAndUpdate(fileImportId, {
      status: "completed",
      fieldNames: headers,
      totalRecords: records.length,
      successRecords: validRecords,
      errorRecords,
      errors: errors.slice(0, 100),
      completedAt: new Date(),
    });

    await job.progress(100);

    return {
      success: true,
      recordCount: records.length,
      validRecords,
      errorRecords,
      mappedRecords: mappedRecords.length,
      createdContacts: createdCount,
      updatedContacts: updatedCount,
    };
  } catch (error: any) {
    console.error("File processing error:", error);

    await FileImport.findByIdAndUpdate(fileImportId, {
      status: "failed",
      error: error.message || "Unknown error during file processing",
    });

    throw error;
  }
}

if (typeof window === "undefined" && fileProcessingQueue) {
  console.log("Initializing file processing worker");
  fileProcessingQueue.process(processFileImport);
}

fileProcessingQueue.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} has been completed`);
});

fileProcessingQueue.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} has failed with error: ${err.message}`);
});

process.on("SIGTERM", async () => {
  console.log("[Worker] File processing worker shutting down...");
  await fileProcessingQueue.close();
  process.exit(0);
});

console.log("[Worker] File processing worker started");
