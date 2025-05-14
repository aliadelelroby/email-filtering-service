import mongoose, { Schema } from "mongoose";

export interface ITemplate {
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  category: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    plainTextContent: {
      type: String,
    },
    category: {
      type: String,
      default: "general",
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Template ||
  mongoose.model<ITemplate>("Template", TemplateSchema);
