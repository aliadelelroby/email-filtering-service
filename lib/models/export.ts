import mongoose, { Schema, Document } from "mongoose";

export interface IExportFilter {
  field: string;
  operator: string;
  value: string;
}

export interface IExport extends Document {
  name: string;
  format: "csv" | "json" | "txt";
  filters: IExportFilter[];
  matchType: "all" | "any";
  selectedFields: string[];
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  queueJobId?: string;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExportSchema = new Schema<IExport>(
  {
    name: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ["csv", "json", "txt"],
      required: true,
    },
    filters: [
      {
        field: {
          type: String,
          required: true,
        },
        operator: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          default: "",
        },
      },
    ],
    matchType: {
      type: String,
      enum: ["all", "any"],
      default: "all",
    },
    selectedFields: {
      type: [String],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    queueJobId: String,
    filePath: String,
    fileSize: Number,
    recordCount: Number,
    error: String,
    completedAt: Date,
  },
  { timestamps: true }
);

// Create indexes for faster querying
ExportSchema.index({ status: 1 });
ExportSchema.index({ createdAt: 1 });
ExportSchema.index({ queueJobId: 1 });
ExportSchema.index({ progress: 1, status: 1 });

export default mongoose.models.Export ||
  mongoose.model<IExport>("Export", ExportSchema);
