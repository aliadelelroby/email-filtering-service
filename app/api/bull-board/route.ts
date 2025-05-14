import { NextRequest, NextResponse } from "next/server";
import { serverAdapter } from "@/lib/queue";

// Create a handler function that will be used by all methods
const handler = async (req: NextRequest) => {
  try {
    // Check if serverAdapter is available (it might not be during build time)
    if (!serverAdapter) {
      return NextResponse.json(
        { error: "Bull board is not available in this environment" },
        { status: 503 }
      );
    }

    // Call the server adapter with the request details
    return serverAdapter.getNextJsResponse(
      req.method,
      new URL(req.url).pathname,
      {
        headers: Object.fromEntries(req.headers),
        body: await req.text(),
        query: Object.fromEntries(new URL(req.url).searchParams),
      }
    );
  } catch (error) {
    console.error("Bull board error:", error);
    return NextResponse.json(
      { error: "Bull board request failed" },
      { status: 500 }
    );
  }
};

// Export all the HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;

// Make sure the Bull Board UI is only accessible in development or with proper authentication
export const config = {
  api: {
    // Disable body parsing as Bull Board will handle it
    bodyParser: false,
  },
};
