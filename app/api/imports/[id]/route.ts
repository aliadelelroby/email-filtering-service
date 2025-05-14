import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import FileImport from "@/lib/models/file-import";
import mongoose from "mongoose";

/**
 * Get a specific import by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid import ID format" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const fileImport = await FileImport.findById(id).lean();

    if (!fileImport) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, import: fileImport });
  } catch (error: any) {
    console.error("Import fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Update a specific import by ID
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid import ID format" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Prevent updating certain fields directly
    const { _id, createdAt, ...updateData } = body;

    const updatedImport = await FileImport.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedImport) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, import: updatedImport });
  } catch (error: any) {
    console.error("Import update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Delete a specific import by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid import ID format" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const deletedImport = await FileImport.findByIdAndDelete(id).lean();

    if (!deletedImport) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Import deletion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
