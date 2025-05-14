/**
 * Worker manager for centralizing Bull queue worker initialization
 */

import { fileProcessingQueue, exportQueue } from "@/lib/queue";

// Track initialization state
let workersInitialized = false;

/**
 * Initialize all queue workers for the application
 * This should be called only once from the API init-workers route
 */
export function initializeWorkers() {
  if (workersInitialized) {
    console.log("Workers already initialized, skipping");
    return false;
  }

  if (typeof window !== "undefined") {
    console.log("Cannot initialize workers in browser environment");
    return false;
  }

  console.log("Initializing all workers centrally");

  // Import worker modules - they will self-initialize
  require("@/lib/workers/index");

  // Set up any additional event handlers here
  if (fileProcessingQueue) {
    fileProcessingQueue.on("global:completed", (jobId) => {
      console.log(`File processing job ${jobId} completed successfully`);
    });
  }

  if (exportQueue) {
    exportQueue.on("global:completed", (jobId) => {
      console.log(`Export job ${jobId} completed successfully`);
    });
  }

  workersInitialized = true;
  return true;
}

/**
 * Check if workers have been initialized
 */
export function areWorkersInitialized() {
  return workersInitialized;
}

/**
 * Get status information about all queues
 */
export async function getQueueStatus() {
  const status = {
    workersInitialized,
    queues: [] as any[],
  };

  if (fileProcessingQueue) {
    status.queues.push({
      name: "file-processing",
      counts: await fileProcessingQueue.getJobCounts(),
    });
  }

  if (exportQueue) {
    status.queues.push({
      name: "exports",
      counts: await exportQueue.getJobCounts(),
    });
  }

  return status;
}
