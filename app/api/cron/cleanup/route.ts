import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { cleanupOldExports } from "@/lib/export-processor";

// This route can be called by a cron job to clean up old export files
export async function POST(req: NextRequest) {
  try {
    // Check for secret token to ensure this is a legitimate request
    const authHeader = req.headers.get("authorization");
    if (
      !authHeader ||
      authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Run cleanup
    await cleanupOldExports();

    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully",
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Allow this endpoint to be called from cron services
export const config = {
  api: {
    bodyParser: true,
  },
};
