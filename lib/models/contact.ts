import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  email: string;
  firstName?: string;
  lastName?: string;
  tags: string[];
  customFields: Record<string, any>;

  // Professional info
  jobTitle?: string;
  seniority?: string;
  department?: string;

  // Company info
  company?: string;
  companyWebsite?: string;
  companySize?: string;
  industry?: string;

  // Additional contact info
  phone?: string;
  linkedinUrl?: string;
  twitterHandle?: string;

  // Location info
  country?: string;
  city?: string;
  state?: string;

  // Tracking info
  source?: string;
  confidence?: number;

  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Professional info
    jobTitle: {
      type: String,
      trim: true,
    },
    seniority: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },

    // Company info
    company: {
      type: String,
      trim: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
    },
    companySize: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },

    // Additional contact info
    phone: {
      type: String,
      trim: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
    },
    twitterHandle: {
      type: String,
      trim: true,
    },

    // Location info
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },

    // Tracking info
    source: {
      type: String,
      trim: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// Create index for faster querying
ContactSchema.index({ email: 1 });
ContactSchema.index({ tags: 1 });
ContactSchema.index({ createdAt: -1 });
ContactSchema.index({ company: 1 });
ContactSchema.index({ jobTitle: 1 });
ContactSchema.index({ department: 1 });
ContactSchema.index({ country: 1 });
ContactSchema.index({ industry: 1 });

export default mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", ContactSchema);
