import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Contact from "@/lib/models/contact";

/**
 * Maps common job title/role variations to standardized search terms
 */
const jobTitleSynonyms: Record<string, string[]> = {
  // C-level positions
  ceo: [
    "chief executive officer",
    "founder",
    "co-founder",
    "president",
    "owner",
    "managing director",
  ],
  cto: [
    "chief technology officer",
    "vp of technology",
    "vp of engineering",
    "head of technology",
    "head of engineering",
  ],
  cfo: [
    "chief financial officer",
    "vp of finance",
    "head of finance",
    "finance director",
    "financial controller",
  ],
  cmo: [
    "chief marketing officer",
    "vp of marketing",
    "head of marketing",
    "marketing director",
  ],
  coo: [
    "chief operating officer",
    "vp of operations",
    "head of operations",
    "operations director",
  ],

  // VP/Director level
  vp: [
    "vice president",
    "vice-president",
    "senior director",
    "executive director",
  ],
  director: ["head of", "lead", "senior manager"],

  // Engineering
  engineer: [
    "developer",
    "programmer",
    "coder",
    "software engineer",
    "software developer",
  ],
  "engineering manager": [
    "dev manager",
    "development manager",
    "engineering lead",
    "tech lead",
  ],

  // Sales
  sales: [
    "account executive",
    "business development",
    "sales representative",
    "account manager",
  ],

  // Marketing
  marketing: ["brand", "growth", "communication", "digital marketing"],

  // HR/People
  hr: ["human resources", "people operations", "talent", "recruitment"],
};

/**
 * Maps common department variations to standardized search terms
 */
const departmentSynonyms: Record<string, string[]> = {
  engineering: ["development", "r&d", "tech", "product development", "it"],
  marketing: ["communications", "brand", "growth", "digital marketing"],
  sales: ["business development", "revenue", "account management"],
  finance: ["accounting", "financial", "treasury"],
  hr: [
    "human resources",
    "people",
    "people operations",
    "talent",
    "recruitment",
  ],
  product: ["product management", "product development", "ux", "design"],
  operations: ["administration", "logistics", "support", "customer service"],
};

/**
 * Maps seniority level variations to standardized search terms
 */
const senioritySynonyms: Record<string, string[]> = {
  "c-level": ["executive", "cxo", "chief"],
  executive: ["c-level", "cxo", "chief", "president"],
  vp: ["vice president", "vice-president", "senior director"],
  director: ["senior manager", "head of", "lead"],
  manager: ["team lead", "supervisor"],
  senior: ["sr", "lead", "principal", "staff"],
  "mid-level": ["intermediate", "associate"],
  junior: ["entry level", "associate", "jr"],
};

/**
 * Maps industry variations to standardized search terms
 */
const industrySynonyms: Record<string, string[]> = {
  tech: [
    "technology",
    "software",
    "information technology",
    "it",
    "saas",
    "cloud",
    "computer",
    "digital",
  ],
  finance: [
    "financial services",
    "banking",
    "investment",
    "insurance",
    "fintech",
  ],
  healthcare: [
    "health",
    "medical",
    "pharma",
    "pharmaceutical",
    "biotech",
    "life sciences",
  ],
  retail: [
    "e-commerce",
    "ecommerce",
    "consumer goods",
    "shopping",
    "marketplace",
  ],
  manufacturing: ["production", "industrial", "factory", "fabrication"],
  media: ["entertainment", "publishing", "news", "marketing", "advertising"],
  education: [
    "edtech",
    "learning",
    "academic",
    "training",
    "schools",
    "university",
  ],
  consulting: ["professional services", "business services", "advisory"],
  "real estate": ["property", "construction", "housing", "architecture"],
  energy: ["oil", "gas", "utilities", "renewable", "power", "electricity"],
  transportation: ["logistics", "shipping", "supply chain", "delivery"],
  hospitality: ["travel", "tourism", "hotel", "restaurant", "food service"],
};

/**
 * Expands a search term to include synonyms
 */
function expandSearchTerms(field: string, value: string): string[] {
  if (!value || typeof value !== "string") {
    return [value];
  }

  // Normalize to lowercase and trim
  const normalizedValue = value.toLowerCase().trim();
  if (!normalizedValue) {
    return [value];
  }

  // Return the original value if no synonyms found
  let synonymsMap: Record<string, string[]> = {};

  if (field === "jobTitle") {
    synonymsMap = jobTitleSynonyms;
  } else if (field === "department") {
    synonymsMap = departmentSynonyms;
  } else if (field === "seniority") {
    synonymsMap = senioritySynonyms;
  } else if (field === "industry") {
    synonymsMap = industrySynonyms;
  } else {
    return [value]; // No synonyms for other fields
  }

  // Results set to avoid duplicates
  const results = new Set<string>([value]);

  // Look for direct match in keys
  if (synonymsMap[normalizedValue]) {
    synonymsMap[normalizedValue].forEach((synonym) => results.add(synonym));
    results.add(normalizedValue);
    return Array.from(results);
  }

  // Check if value contains any key
  for (const [key, synonyms] of Object.entries(synonymsMap)) {
    // Exact match on key
    if (key === normalizedValue) {
      synonyms.forEach((synonym) => results.add(synonym));
      results.add(key);
      continue;
    }

    // Key contains the search value or vice versa
    if (key.includes(normalizedValue) || normalizedValue.includes(key)) {
      results.add(key);
      synonyms.forEach((synonym) => results.add(synonym));
      continue;
    }

    // Check if any synonym matches
    for (const synonym of synonyms) {
      if (
        synonym === normalizedValue ||
        synonym.includes(normalizedValue) ||
        normalizedValue.includes(synonym)
      ) {
        results.add(key);
        synonyms.forEach((s) => results.add(s));
        break;
      }
    }
  }

  // If still no matches found and the term is short (likely an abbreviation)
  if (results.size === 1 && normalizedValue.length <= 3) {
    // Special case for abbreviations: check if any keys match the abbreviation pattern
    for (const [key, synonyms] of Object.entries(synonymsMap)) {
      // For very short terms like "VP", we also check for keys that might be the expanded form
      const words = key.split(/\s+/);
      if (words.length > 1) {
        const abbreviation = words
          .map((word) => word[0])
          .join("")
          .toLowerCase();
        if (abbreviation === normalizedValue) {
          results.add(key);
          synonyms.forEach((synonym) => results.add(synonym));
        }
      }

      // Also check if any synonym is an abbreviation
      for (const synonym of synonyms) {
        const words = synonym.split(/\s+/);
        if (words.length > 1) {
          const abbreviation = words
            .map((word) => word[0])
            .join("")
            .toLowerCase();
          if (abbreviation === normalizedValue) {
            results.add(key);
            synonyms.forEach((s) => results.add(s));
            break;
          }
        }
      }
    }
  }

  return results.size > 1 ? Array.from(results) : [value];
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");

    // Support both limit and pageSize parameters (pageSize takes precedence if both are provided)
    const pageSize = parseInt(
      searchParams.get("pageSize") || searchParams.get("limit") || "10"
    );
    const search = searchParams.get("search") || "";

    // Build query object
    const query: Record<string, any> = {};

    // Process advanced filters
    const filterFields = [
      "jobTitle",
      "department",
      "seniority",
      "industry",
      "country",
      "city",
      "companySize",
      "source",
    ];

    // Add all supported filters
    filterFields.forEach((field) => {
      const filterValue = searchParams.get(field);
      if (filterValue) {
        // Handle comma-separated values for multiple selection
        if (filterValue.includes(",")) {
          // Split values and expand each one with synonyms if appropriate
          const values = filterValue.split(",");
          const expandedValues: string[] = [];

          values.forEach((val) => {
            // Only expand certain fields
            if (
              ["jobTitle", "department", "seniority", "industry"].includes(
                field
              )
            ) {
              expandedValues.push(
                ...expandSearchTerms(field, val.replace(/[\[\]']/g, ""))
              );
            } else {
              expandedValues.push(val.replace(/[\[\]']/g, ""));
            }
          });

          // Create array of regexes for case-insensitive partial matches
          query[field] = {
            $in: expandedValues.map((val) => new RegExp(val, "i")),
          };
        } else {
          // For single value, expand with synonyms if appropriate
          if (
            ["jobTitle", "department", "seniority", "industry"].includes(field)
          ) {
            const expandedValues = expandSearchTerms(
              field,
              filterValue.replace(/[\[\]']/g, "")
            );
            query[field] = {
              $in: expandedValues.map((val) => new RegExp(val, "i")),
            };
          } else {
            // Use regex for case-insensitive partial match that ignores array formatting
            query[field] = {
              $regex: filterValue.replace(/[\[\]']/g, ""),
              $options: "i",
            };
          }
        }
      }
    });

    // Add search functionality
    if (search) {
      const jobTitleSearchTerms = expandSearchTerms("jobTitle", search);
      const departmentSearchTerms = expandSearchTerms("department", search);
      const industrySearchTerms = expandSearchTerms("industry", search);

      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        {
          jobTitle: {
            $in: jobTitleSearchTerms.map((term) => new RegExp(term, "i")),
          },
        },
        {
          department: {
            $in: departmentSearchTerms.map((term) => new RegExp(term, "i")),
          },
        },
        {
          industry: {
            $in: industrySearchTerms.map((term) => new RegExp(term, "i")),
          },
        },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Execute query with pagination
    const [contacts, total] = await Promise.all([
      Contact.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Contact.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const pages = Math.ceil(total / pageSize);

    // Transform for frontend
    const formattedContacts = contacts.map((contact: any) => ({
      id: contact._id.toString(),
      email: contact.email,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      tags: contact.tags || [],

      // Professional info
      jobTitle: contact.jobTitle || "",
      seniority: contact.seniority
        ? contact.seniority.replace(/[\[\]']/g, "")
        : "",
      department: contact.department || "",

      // Company info
      company: contact.company || "",
      companyWebsite: contact.companyWebsite || "",
      companySize: contact.companySize || "",
      industry: contact.industry || "",

      // Additional contact info
      phone: contact.phone || "",
      linkedinUrl: contact.linkedinUrl || "",
      twitterHandle: contact.twitterHandle || "",

      // Location info
      country: contact.country || "",
      city: contact.city || "",
      state: contact.state || "",

      // Tracking info
      source: contact.source || "",
      confidence: contact.confidence || 0,
    }));

    return NextResponse.json({
      contacts: formattedContacts,
      pagination: {
        total,
        pages,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // Validate required fields
    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Create the contact with all possible fields
    const contact = await Contact.create({
      email: body.email,
      firstName: body.firstName || "",
      lastName: body.lastName || "",
      tags: body.tags || [],
      customFields: body.customFields || {},

      // Professional info
      jobTitle: body.jobTitle || "",
      seniority: body.seniority || "",
      department: body.department || "",

      // Company info
      company: body.company || "",
      companyWebsite: body.companyWebsite || "",
      companySize: body.companySize || "",
      industry: body.industry || "",

      // Additional contact info
      phone: body.phone || "",
      linkedinUrl: body.linkedinUrl || "",
      twitterHandle: body.twitterHandle || "",

      // Location info
      country: body.country || "",
      city: body.city || "",
      state: body.state || "",

      // Tracking info
      source: body.source || "",
      confidence: body.confidence || 0,
    });

    return NextResponse.json({
      success: true,
      message: "Contact created successfully",
      contact: {
        id: contact._id.toString(),
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        jobTitle: contact.jobTitle,
      },
    });
  } catch (error: any) {
    console.error("Contact creation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
