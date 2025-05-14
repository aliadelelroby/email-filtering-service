import mongoose, { Schema } from "mongoose";

export interface IFileImportErrors {
  line: number;
  message: string;
}

export interface IFileImport {
  fileName: string;
  fileSize: number;
  fileType: string;
  status: "pending" | "processing" | "completed" | "failed";
  fieldMapping?: Record<string, string>;
  storedAs?: string;
  queueJobId?: string;
  uploadedBy?: string;
  totalRecords?: number;
  processedRecords?: number;
  successRecords?: number;
  errorRecords?: number;
  errors?: IFileImportErrors[];
  fieldNames?: string[];
  error?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FileImportSchema = new Schema<IFileImport>(
  {
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    fieldMapping: {
      type: Map,
      of: String,
      default: {},
    },
    storedAs: {
      type: String,
    },
    queueJobId: {
      type: String,
    },
    uploadedBy: {
      type: String,
      default: "anonymous",
    },
    totalRecords: {
      type: Number,
    },
    processedRecords: {
      type: Number,
      default: 0,
    },
    successRecords: {
      type: Number,
      default: 0,
    },
    errorRecords: {
      type: Number,
      default: 0,
    },
    errors: {
      type: [
        {
          line: Number,
          message: String,
        },
      ],
      default: [],
    },
    fieldNames: {
      type: [String],
      default: [],
    },
    error: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.FileImport ||
  mongoose.model<IFileImport>("FileImport", FileImportSchema);
