import { NextResponse } from "next/server";
import { initializeWorkers, areWorkersInitialized } from "../worker-manager";

/**
 * Route handler to initialize queue workers for background processing
 */
export async function GET() {
  try {
    const initialized = initializeWorkers();

    if (initialized) {
      return NextResponse.json({
        status: "Workers successfully initialized",
      });
    } else {
      return NextResponse.json({
        status: "Workers were already initialized",
        initialized: areWorkersInitialized(),
      });
    }
  } catch (error: any) {
    console.error("Error initializing workers:", error);
    return NextResponse.json(
      {
        status: "Failed to initialize workers",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Force Next.js to treat this as a dynamic route
export const dynamic = "force-dynamic";
