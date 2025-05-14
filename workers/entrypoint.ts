import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// The directory containing all job worker files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const jobsDirectory = path.join(__dirname, "jobs");

// Ensure worker directory exists
if (!fs.existsSync(jobsDirectory)) {
  console.warn(`Jobs directory not found at ${jobsDirectory}. Creating it...`);
  fs.mkdirSync(jobsDirectory, { recursive: true });
}

/**
 * Loads and starts a worker from a file in the jobs directory
 * @param filename The worker file to load
 * @param dir The directory containing worker files
 */
async function startWorker(filename: string, dir: string) {
  try {
    // Skip non-js/ts files
    if (!filename.endsWith(".js") && !filename.endsWith(".ts")) {
      return;
    }

    // Skip this entry point file itself
    if (filename === "entrypoint.js" || filename === "entrypoint.ts") {
      return;
    }

    console.log(`Loading worker from ${filename}...`);

    // Import the worker module
    const workerPath = path.join(dir, filename);
    await import(workerPath);

    console.log(`Worker loaded successfully: ${filename}`);
  } catch (error) {
    console.error(`Error loading worker ${filename}:`, error);
  }
}

/**
 * Main function to start all workers
 */
async function startAllWorkers() {
  try {
    console.log("Starting workers...");

    // If file-processing.ts exists, move it to jobs directory
    const legacyWorkerFile = path.join(__dirname, "file-processing.ts");
    const targetFile = path.join(jobsDirectory, "file-processing.ts");

    if (fs.existsSync(legacyWorkerFile) && !fs.existsSync(targetFile)) {
      console.log(`Moving legacy worker file to jobs directory...`);
      fs.copyFileSync(legacyWorkerFile, targetFile);
    }

    // Read all worker files from the jobs directory
    const files = fs.readdirSync(jobsDirectory);

    // Start each worker
    for (const file of files) {
      await startWorker(file, jobsDirectory);
    }

    console.log("All workers started successfully");
  } catch (error) {
    console.error("Failed to start workers:", error);
    process.exit(1);
  }
}

// Start all workers
startAllWorkers();
