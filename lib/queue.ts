import Queue from "bull";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";

// Ensure this code only runs on the server
const isServer = typeof window === "undefined";

// Queue names
export const QUEUE_NAMES = {
  EXPORTS: "exports",
  FILE_PROCESSING: "file-processing",
};

// Define connection config once
const getRedisConfig = () => ({
  redis: {
    port: parseInt(process.env.REDIS_PORT || "6379"),
    host: process.env.REDIS_HOST || "localhost",
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  },
});

// Job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: true,
  timeout: 30 * 60 * 1000, // 30 minutes timeout for large exports
};

// Create queues only on server
let exportQueue: Queue.Queue | null = null;
let fileProcessingQueue: Queue.Queue | null = null;
let serverAdapter: any = null;

if (isServer) {
  try {
    const redisConfig = getRedisConfig();

    // Create queues
    exportQueue = new Queue(QUEUE_NAMES.EXPORTS, {
      ...redisConfig,
      defaultJobOptions,
      settings: {
        stalledInterval: 60000,
        maxStalledCount: 2,
      },
    });

    fileProcessingQueue = new Queue(QUEUE_NAMES.FILE_PROCESSING, {
      ...redisConfig,
      defaultJobOptions,
      settings: {
        stalledInterval: 60000,
        maxStalledCount: 2,
      },
    });

    // Setup queue monitoring
    serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/api/bull-board");

    createBullBoard({
      queues: [
        new BullAdapter(exportQueue),
        new BullAdapter(fileProcessingQueue),
      ],
      serverAdapter,
    });

    // Graceful shutdown
    ["SIGTERM", "SIGINT", "SIGQUIT"].forEach((signal) => {
      process.on(signal, async () => {
        if (exportQueue) await exportQueue.close();
        if (fileProcessingQueue) await fileProcessingQueue.close();
        process.exit(0);
      });
    });

    // Set up event listeners for file processing queue
    fileProcessingQueue.on("active", (job) => {
      console.log(`File processing job ${job.id} is now active`);
    });

    fileProcessingQueue.on("completed", (job) => {
      console.log(`File processing job ${job.id} has completed`);
    });

    fileProcessingQueue.on("failed", (job, err) => {
      console.error(`File processing job ${job.id} has failed:`, err);
    });
  } catch (error) {
    console.error("Bull queue initialization error:", error);
  }
}

// Helper functions
export interface FileProcessingJob {
  fileImportId: string;
  filePath: string;
  fieldMapping?: Record<string, string>;
}

export async function addFileProcessingJob(data: FileProcessingJob) {
  if (!isServer || !fileProcessingQueue) {
    throw new Error("File processing queue is only available on the server");
  }
  return fileProcessingQueue.add(data);
}

export async function addExportJob(data: any) {
  if (!isServer || !exportQueue) {
    throw new Error("Export queue is only available on the server");
  }
  return exportQueue.add(data);
}

export async function getJobProgress(
  jobId: string,
  queueType: "exports" | "file-processing" = "exports"
) {
  let queue = null;

  if (queueType === "exports") {
    queue = exportQueue;
  } else if (queueType === "file-processing") {
    queue = fileProcessingQueue;
  }

  if (!isServer || !queue) {
    throw new Error(`${queueType} queue is only available on the server`);
  }

  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = await job.progress();

  return {
    id: job.id,
    data: job.data,
    progress: progress !== undefined ? progress : 0,
    state,
    failedReason: job.failedReason,
    returnvalue: job.returnvalue,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

// Export for use in other server components
export { exportQueue, fileProcessingQueue, serverAdapter };
