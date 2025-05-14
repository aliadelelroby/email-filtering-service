import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Contact from "@/lib/models/contact";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Get total count
    const total = await Contact.countDocuments();

    // Get active contacts
    const active = await Contact.countDocuments({ status: "active" });

    // Get inactive contacts (unsubscribed + bounced)
    const inactive = await Contact.countDocuments({
      status: { $in: ["unsubscribed", "bounced"] },
    });

    return NextResponse.json({
      success: true,
      total,
      active,
      inactive,
    });
  } catch (error: any) {
    console.error("Contacts stats error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
