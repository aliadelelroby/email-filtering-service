import { useState, useEffect, FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Props for the FieldMapping component
 */
interface FieldMappingProps {
  sourceFields: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
  isRequired?: boolean;
}

/**
 * System fields that can be mapped to source fields
 */
const SYSTEM_FIELDS = [
  // Basic contact information
  { id: "email", label: "Email Address", required: true },
  { id: "firstName", label: "First Name", required: false },
  { id: "lastName", label: "Last Name", required: false },
  { id: "status", label: "Status", required: false },

  // Professional info
  { id: "jobTitle", label: "Job Title", required: false },
  { id: "seniority", label: "Seniority", required: false },
  { id: "department", label: "Department", required: false },

  // Company info
  { id: "company", label: "Company", required: false },
  { id: "companyWebsite", label: "Company Website", required: false },
  { id: "companySize", label: "Company Size", required: false },
  { id: "industry", label: "Industry", required: false },

  // Additional contact info
  { id: "phone", label: "Phone Number", required: false },
  { id: "linkedinUrl", label: "LinkedIn URL", required: false },
  { id: "twitterHandle", label: "Twitter Handle", required: false },

  // Location info
  { id: "address", label: "Address", required: false },
  { id: "city", label: "City", required: false },
  { id: "state", label: "State/Province", required: false },
  { id: "postalCode", label: "Postal Code", required: false },
  { id: "country", label: "Country", required: false },

  // Other fields
  { id: "tags", label: "Tags", required: false },
  { id: "source", label: "Source", required: false },
  { id: "confidence", label: "Confidence Score", required: false },
  { id: "verificationStatus", label: "Verification Status", required: false },
  { id: "custom", label: "Custom Field", required: false },
];

/**
 * Component for mapping source fields to system fields
 */
export function FieldMapping({
  sourceFields,
  onMappingComplete,
  isRequired = true,
}: FieldMappingProps) {
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [autoMapApplied, setAutoMapApplied] = useState(false);

  // Check if all required fields are mapped
  const isMappingComplete = () => {
    return SYSTEM_FIELDS.filter((f) => f.required).every((field) =>
      Object.values(fieldMapping).includes(field.id)
    );
  };

  // Apply auto-mapping based on field name similarity
  const applyAutoMapping = () => {
    const newMapping = { ...fieldMapping };
    let mappingUpdated = false;

    // Track which system fields have already been mapped to prevent duplicates
    const mappedSystemFields = new Set(
      Object.values(newMapping).filter(Boolean)
    );

    // Common field name variations for better matching
    const fieldVariations: Record<string, string[]> = {
      email: [
        "email",
        "email_address",
        "mail",
        "e-mail",
        "work_email",
        "personal_email",
        "emails",
      ],
      firstName: [
        "first_name",
        "firstname",
        "name",
        "given_name",
        "first name",
        "given name",
      ],
      lastName: [
        "last_name",
        "lastname",
        "surname",
        "family_name",
        "last name",
        "family name",
      ],
      jobTitle: [
        "job_title",
        "job title",
        "title",
        "position",
        "role",
        "job_role",
        "job role",
      ],
      seniority: [
        "seniority",
        "level",
        "job_level",
        "job level",
        "experience_level",
      ],
      department: ["department", "dept", "team", "division", "function"],
      company: [
        "company",
        "company_name",
        "organization",
        "organisation",
        "employer",
        "workplace",
        "job_company_name",
      ],
      companyWebsite: [
        "company_website",
        "website",
        "company_url",
        "company_web",
        "work_website",
        "job_company_website",
      ],
      companySize: [
        "company_size",
        "size",
        "employees",
        "headcount",
        "employee_count",
        "job_company_size",
      ],
      industry: ["industry", "sector", "business", "job_company_industry"],
      phone: [
        "phone",
        "telephone",
        "mobile",
        "cell",
        "phone_number",
        "mobile_phone",
        "work_phone",
        "phone_numbers",
      ],
      linkedinUrl: [
        "linkedin",
        "linkedin_url",
        "linkedin_profile",
        "linkedin_link",
        "linkedin_username",
      ],
      twitterHandle: [
        "twitter",
        "twitter_handle",
        "twitter_username",
        "twitter_account",
        "twitter_url",
      ],
      address: [
        "address",
        "street_address",
        "street",
        "location_street_address",
      ],
      city: ["city", "town", "locality", "location_locality"],
      state: ["state", "province", "region", "location_region"],
      country: ["country", "nation", "location_country"],
      tags: ["tags", "categories", "labels", "groups", "segments"],
      source: [
        "source",
        "lead_source",
        "origin",
        "channel",
        "acquisition_source",
      ],
    };

    // Process fields in order of priority: required fields first
    const prioritizedSourceFields = [...sourceFields].sort((a, b) => {
      // Required fields (like email) should be processed first
      const aIsEmail = a.toLowerCase().includes("email");
      const bIsEmail = b.toLowerCase().includes("email");
      if (aIsEmail && !bIsEmail) return -1;
      if (!aIsEmail && bIsEmail) return 1;
      return 0;
    });

    // First pass: try exact matches only
    for (const sourceField of prioritizedSourceFields) {
      // Skip fields that are already mapped
      if (newMapping[sourceField]) continue;

      const normalizedSourceField = sourceField.toLowerCase().trim();

      // Look for exact matches first
      const exactMatch = SYSTEM_FIELDS.find(
        (systemField) =>
          systemField.id.toLowerCase() === normalizedSourceField ||
          systemField.label.toLowerCase() === normalizedSourceField
      );

      if (exactMatch && !mappedSystemFields.has(exactMatch.id)) {
        newMapping[sourceField] = exactMatch.id;
        mappedSystemFields.add(exactMatch.id);
        mappingUpdated = true;
      }
    }

    // Second pass: try variations mapping with exact matches
    for (const sourceField of prioritizedSourceFields) {
      // Skip fields that are already mapped
      if (newMapping[sourceField]) continue;

      const normalizedSourceField = sourceField.toLowerCase().trim();

      for (const [systemFieldId, variations] of Object.entries(
        fieldVariations
      )) {
        // Skip system fields that are already mapped
        if (mappedSystemFields.has(systemFieldId)) continue;

        // Look for exact matches in variations
        if (
          variations.some((variation) => normalizedSourceField === variation)
        ) {
          newMapping[sourceField] = systemFieldId;
          mappedSystemFields.add(systemFieldId);
          mappingUpdated = true;
          break;
        }
      }
    }

    // Third pass: try more relaxed matching
    for (const sourceField of prioritizedSourceFields) {
      // Skip fields that are already mapped
      if (newMapping[sourceField]) continue;

      const normalizedSourceField = sourceField.toLowerCase().trim();

      // Try using variations with partial matching
      for (const [systemFieldId, variations] of Object.entries(
        fieldVariations
      )) {
        // Skip system fields that are already mapped
        if (mappedSystemFields.has(systemFieldId)) continue;

        if (
          variations.some(
            (variation) =>
              normalizedSourceField.includes(variation) ||
              variation.includes(normalizedSourceField)
          )
        ) {
          newMapping[sourceField] = systemFieldId;
          mappedSystemFields.add(systemFieldId);
          mappingUpdated = true;
          break;
        }
      }
    }

    // Fourth pass: try fuzzy matching
    for (const sourceField of prioritizedSourceFields) {
      // Skip fields that are already mapped
      if (newMapping[sourceField]) continue;

      const normalizedSourceField = sourceField.toLowerCase().trim();
      const cleanSourceField = normalizedSourceField.replace(/[^a-z0-9]/g, "");

      // Try fuzzy matching by removing spaces and special characters
      for (const systemField of SYSTEM_FIELDS) {
        // Skip system fields that are already mapped
        if (mappedSystemFields.has(systemField.id)) continue;

        const cleanSystemField = systemField.id
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        if (
          cleanSourceField === cleanSystemField ||
          cleanSourceField.includes(cleanSystemField) ||
          cleanSystemField.includes(cleanSourceField)
        ) {
          newMapping[sourceField] = systemField.id;
          mappedSystemFields.add(systemField.id);
          mappingUpdated = true;
          break;
        }
      }
    }

    if (mappingUpdated) {
      setFieldMapping(newMapping);
      setAutoMapApplied(true);
    }
  };

  // Try auto-mapping on initial load
  useEffect(() => {
    if (sourceFields.length > 0 && !autoMapApplied) {
      applyAutoMapping();
    }
  }, [sourceFields]);

  // Handle field selection change
  const handleFieldChange = (sourceField: string, systemField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [sourceField]: systemField === "none" ? "" : systemField,
    }));
  };

  // Handle mapping completion
  const handleComplete = (e?: FormEvent) => {
    if (e) e.preventDefault();
    onMappingComplete(fieldMapping);
  };

  // Get system field label
  const getSystemFieldLabel = (fieldId: string) => {
    const field = SYSTEM_FIELDS.find((f) => f.id === fieldId);
    return field ? field.label : fieldId;
  };

  // Check if field is mapped to system field
  const isFieldMapped = (sourceField: string) => {
    return !!fieldMapping[sourceField];
  };

  // Show required fields that are not yet mapped
  const unmappedRequiredFields = SYSTEM_FIELDS.filter(
    (field) => field.required && !Object.values(fieldMapping).includes(field.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Your Fields</CardTitle>
        <CardDescription>
          Connect your file headers to our system fields
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Required fields warning */}
        {isRequired && unmappedRequiredFields.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium">
              Required fields not mapped:
            </p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {unmappedRequiredFields.map((field) => (
                <Badge
                  key={field.id}
                  variant="outline"
                  className="bg-amber-100 text-amber-800 border-amber-200"
                >
                  {field.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Auto map button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              applyAutoMapping();
            }}
            type="button"
          >
            Auto-Map Fields
          </Button>
        </div>

        {/* Field mapping section */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-3 mt-4">
            {sourceFields.map((sourceField) => (
              <div
                key={sourceField}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-5 truncate font-medium">
                  {sourceField}
                </div>

                <ArrowRight className="col-span-2 h-4 w-4 mx-auto text-muted-foreground" />

                <div className="col-span-5">
                  <Select
                    value={
                      fieldMapping[sourceField]
                        ? fieldMapping[sourceField]
                        : "none"
                    }
                    onValueChange={(value) =>
                      handleFieldChange(sourceField, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not mapped</SelectItem>

                      <SelectItem value="email" className="font-semibold">
                        Email Address *
                      </SelectItem>

                      {/* Basic contact information */}
                      <SelectItem
                        value="basic-group"
                        disabled
                        className="font-semibold text-muted-foreground"
                      >
                        Basic Information
                      </SelectItem>
                      <SelectItem value="firstName">First Name</SelectItem>
                      <SelectItem value="lastName">Last Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>

                      {/* Professional info */}
                      <SelectItem
                        value="work-group"
                        disabled
                        className="font-semibold text-muted-foreground"
                      >
                        Professional Info
                      </SelectItem>
                      <SelectItem value="jobTitle">Job Title</SelectItem>
                      <SelectItem value="seniority">Seniority</SelectItem>
                      <SelectItem value="department">Department</SelectItem>

                      {/* Company info */}
                      <SelectItem
                        value="company-group"
                        disabled
                        className="font-semibold text-muted-foreground"
                      >
                        Company Info
                      </SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="companyWebsite">
                        Company Website
                      </SelectItem>
                      <SelectItem value="companySize">Company Size</SelectItem>
                      <SelectItem value="industry">Industry</SelectItem>

                      {/* Additional contact info */}
                      <SelectItem
                        value="contact-group"
                        disabled
                        className="font-semibold text-muted-foreground"
                      >
                        Contact Details
                      </SelectItem>
                      <SelectItem value="phone">Phone Number</SelectItem>
                      <SelectItem value="linkedinUrl">LinkedIn URL</SelectItem>
                      <SelectItem value="twitterHandle">
                        Twitter Handle
                      </SelectItem>

                      {/* Location info */}
                      <SelectItem
                        value="location-group"
                        disabled
                        className="font-semibold text-muted-foreground"
                      >
                        Location
                      </SelectItem>
                      <SelectItem value="address">Address</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="state">State/Province</SelectItem>
                      <SelectItem value="postalCode">Postal Code</SelectItem>
                      <SelectItem value="country">Country</SelectItem>

                      {/* Other fields */}
                      <SelectItem
                        value="other-group"
                        disabled
                        className="font-semibold text-muted-foreground"
                      >
                        Other
                      </SelectItem>
                      <SelectItem value="tags">Tags</SelectItem>
                      <SelectItem value="source">Source</SelectItem>
                      <SelectItem value="confidence">
                        Confidence Score
                      </SelectItem>
                      <SelectItem value="verificationStatus">
                        Verification Status
                      </SelectItem>
                      <SelectItem value="custom">Custom Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {/* Complete mapping button */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={(e) => handleComplete(e)}
              disabled={isRequired && !isMappingComplete()}
              type="button"
            >
              {isMappingComplete() ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Apply Mapping
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  {isRequired ? "Complete Required Mapping" : "Apply Mapping"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
