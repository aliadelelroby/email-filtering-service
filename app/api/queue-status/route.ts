import { NextRequest, NextResponse } from "next/server";
import { fileProcessingQueue, exportQueue } from "@/lib/queue";
import { getQueueStatus, areWorkersInitialized } from "../worker-manager";

/**
 * GET request handler for retrieving queue status
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queueName = url.searchParams.get("queue");

    // Check if workers are initialized
    if (!areWorkersInitialized()) {
      return NextResponse.json({
        status: "Workers not initialized",
        initialized: false,
      });
    }

    // Return info based on requested queue
    if (queueName === "file-processing") {
      if (!fileProcessingQueue) {
        return NextResponse.json(
          { error: "File processing queue not available" },
          { status: 503 }
        );
      }

      const jobCounts = await fileProcessingQueue.getJobCounts();
      return NextResponse.json({
        queue: "file-processing",
        counts: jobCounts,
      });
    }

    if (queueName === "exports") {
      if (!exportQueue) {
        return NextResponse.json(
          { error: "Export queue not available" },
          { status: 503 }
        );
      }

      const jobCounts = await exportQueue.getJobCounts();
      return NextResponse.json({
        queue: "exports",
        counts: jobCounts,
      });
    }

    // If no specific queue requested, return all queue info
    const status = await getQueueStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Queue status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve queue status" },
      { status: 500 }
    );
  }
}

// Force Next.js to treat this as a dynamic route
export const dynamic = "force-dynamic";
