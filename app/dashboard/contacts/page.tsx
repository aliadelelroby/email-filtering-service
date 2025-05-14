"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
  Tag,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCcw,
  UserPlus,
  FileUp,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Building,
  MapPin,
  Linkedin,
  Twitter,
  Phone,
  Mail,
  Calendar,
  Users,
  Globe,
  Link,
  BadgeCheck,
  XCircle,
  Info,
  ExternalLink,
  Clock,
  ChevronRight as ChevronRightIcon,
  X,
  SlidersHorizontal,
  Check as CheckIcon,
  ChevronDown,
} from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

// Define contact interface for typing
interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tags: string[];

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
}

interface PaginationData {
  total: number;
  pages: number;
  page: number;
  pageSize: number;
}

// Filtering interfaces
interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface FilterGroup {
  id: string;
  name: string;
  options: FilterOption[];
  expanded?: boolean;
}

interface AppliedFilter {
  groupId: string;
  filterId: string;
  label: string;
  value: string;
}

const exportToCSV = (data: any[], filename: string) => {
  // Get headers from first object keys
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);

  // Convert data to CSV format
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(","));

  // Add rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value =
        row[header] === null || row[header] === undefined ? "" : row[header];

      // Handle arrays and objects by converting to string
      const cellValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      // Escape quotes and wrap in quotes if needed
      const escaped = cellValue.replace(/"/g, '""');
      return `"${escaped}"`;
    });

    csvRows.push(values.join(","));
  }

  // Join rows with newlines
  const csvString = csvRows.join("\n");

  // Create a blob and download
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    seniority: false,
    department: false,
    industry: false,
    phone: false,
    source: false,
  });
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
    {
      id: "jobTitle",
      name: "Job Title",
      expanded: false,
      options: [
        { id: "ceo", label: "CEO", value: "ceo" },
        { id: "cto", label: "CTO", value: "cto" },
        { id: "cfo", label: "CFO", value: "cfo" },
        { id: "cmo", label: "CMO", value: "cmo" },
        { id: "coo", label: "COO", value: "coo" },
        { id: "vp-sales", label: "VP of Sales", value: "vp of sales" },
        {
          id: "vp-marketing",
          label: "VP of Marketing",
          value: "vp of marketing",
        },
        {
          id: "vp-engineering",
          label: "VP of Engineering",
          value: "vp of engineering",
        },
        {
          id: "director-marketing",
          label: "Marketing Director",
          value: "marketing director",
        },
        {
          id: "director-sales",
          label: "Sales Director",
          value: "sales director",
        },
        {
          id: "product-manager",
          label: "Product Manager",
          value: "product manager",
        },
        {
          id: "software-engineer",
          label: "Software Engineer",
          value: "software engineer",
        },
      ],
    },
    {
      id: "department",
      name: "Department",
      expanded: false,
      options: [
        { id: "marketing", label: "Marketing", value: "marketing" },
        { id: "sales", label: "Sales", value: "sales" },
        { id: "engineering", label: "Engineering", value: "engineering" },
        { id: "product", label: "Product", value: "product" },
        { id: "design", label: "Design", value: "design" },
        { id: "operations", label: "Operations", value: "operations" },
        { id: "hr", label: "Human Resources", value: "human resources" },
        { id: "finance", label: "Finance", value: "finance" },
        { id: "executive", label: "Executive", value: "executive" },
      ],
    },
    {
      id: "companySize",
      name: "Company Size",
      expanded: false,
      options: [
        { id: "1-10", label: "1-10 employees", value: "1-10" },
        { id: "11-50", label: "11-50 employees", value: "11-50" },
        { id: "51-200", label: "51-200 employees", value: "51-200" },
        { id: "201-500", label: "201-500 employees", value: "201-500" },
        { id: "501-1000", label: "501-1000 employees", value: "501-1000" },
        { id: "1001-5000", label: "1001-5000 employees", value: "1001-5000" },
        {
          id: "5001-10000",
          label: "5001-10000 employees",
          value: "5001-10000",
        },
        { id: "10001+", label: "10001+ employees", value: "10001+" },
      ],
    },
    {
      id: "seniority",
      name: "Seniority",
      expanded: false,
      options: [
        { id: "c-level", label: "C-Level", value: "c-level" },
        { id: "vp", label: "VP", value: "vp" },
        { id: "director", label: "Director", value: "director" },
        { id: "manager", label: "Manager", value: "manager" },
        { id: "senior", label: "Senior", value: "senior" },
        { id: "junior", label: "Junior", value: "junior" },
        { id: "intern", label: "Intern", value: "intern" },
      ],
    },
    {
      id: "industry",
      name: "Industry",
      expanded: false,
      options: [
        { id: "software", label: "Software", value: "software" },
        { id: "finance", label: "Finance", value: "finance" },
        { id: "healthcare", label: "Healthcare", value: "healthcare" },
        { id: "education", label: "Education", value: "education" },
        { id: "retail", label: "Retail", value: "retail" },
        { id: "manufacturing", label: "Manufacturing", value: "manufacturing" },
        { id: "consulting", label: "Consulting", value: "consulting" },
        { id: "media", label: "Media", value: "media" },
        { id: "real-estate", label: "Real Estate", value: "real estate" },
        {
          id: "transportation",
          label: "Transportation",
          value: "transportation",
        },
        {
          id: "telecommunications",
          label: "Telecommunications",
          value: "telecommunications",
        },
        { id: "energy", label: "Energy", value: "energy" },
        { id: "hospitality", label: "Hospitality", value: "hospitality" },
      ],
    },
    {
      id: "country",
      name: "Country",
      expanded: false,
      options: [
        { id: "us", label: "United States", value: "united states" },
        { id: "ca", label: "Canada", value: "canada" },
        { id: "uk", label: "United Kingdom", value: "united kingdom" },
        { id: "au", label: "Australia", value: "australia" },
        { id: "de", label: "Germany", value: "germany" },
        { id: "fr", label: "France", value: "france" },
        { id: "jp", label: "Japan", value: "japan" },
        { id: "in", label: "India", value: "india" },
        { id: "br", label: "Brazil", value: "brazil" },
        { id: "sg", label: "Singapore", value: "singapore" },
      ],
    },
    {
      id: "city",
      name: "City",
      expanded: false,
      options: [
        { id: "san-francisco", label: "San Francisco", value: "san francisco" },
        { id: "new-york", label: "New York", value: "new york" },
        { id: "london", label: "London", value: "london" },
        { id: "paris", label: "Paris", value: "paris" },
        { id: "berlin", label: "Berlin", value: "berlin" },
        { id: "tokyo", label: "Tokyo", value: "tokyo" },
        { id: "toronto", label: "Toronto", value: "toronto" },
        { id: "sydney", label: "Sydney", value: "sydney" },
        { id: "singapore", label: "Singapore", value: "singapore" },
        { id: "austin", label: "Austin", value: "austin" },
      ],
    },
    {
      id: "source",
      name: "Source",
      expanded: false,
      options: [
        { id: "import", label: "Import", value: "import" },
        { id: "manual", label: "Manual Entry", value: "manual" },
        { id: "signup", label: "Signup", value: "signup" },
        { id: "webform", label: "Web Form", value: "webform" },
        { id: "api", label: "API", value: "api" },
      ],
    },
  ]);

  // Add filter search state
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination state
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    pages: 0,
    page: 1,
    pageSize: 10,
  });

  // Stats
  const [totalContacts, setTotalContacts] = useState(0);
  const [activeContacts, setActiveContacts] = useState(0);
  const [inactiveContacts, setInactiveContacts] = useState(0);

  // Load saved preferences on initial load
  useEffect(() => {
    // Load column visibility preferences
    const savedColumnVisibility = localStorage.getItem(
      "contacts_columnVisibility"
    );
    if (savedColumnVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedColumnVisibility));
      } catch (err) {
        console.error("Failed to parse saved column visibility", err);
      }
    }

    // Load search query
    const savedSearchQuery = localStorage.getItem("contacts_searchQuery");
    if (savedSearchQuery) {
      setSearchQuery(savedSearchQuery);
    }

    // Load pagination page size
    const savedPageSize = localStorage.getItem("contacts_paginationPageSize");
    if (savedPageSize) {
      const pageSize = parseInt(savedPageSize, 10);
      if (!isNaN(pageSize)) {
        setPagination((prev) => ({ ...prev, pageSize }));
      }
    }

    // Load filter sidebar state
    const savedSidebarState = localStorage.getItem(
      "contacts_showFilterSidebar"
    );
    if (savedSidebarState !== null) {
      setShowFilterSidebar(savedSidebarState === "true");
    }

    // Load applied filters
    const savedFilters = localStorage.getItem("contacts_appliedFilters");
    if (savedFilters) {
      try {
        setAppliedFilters(JSON.parse(savedFilters));
      } catch (err) {
        console.error("Failed to parse saved filters", err);
      }
    }

    // Load expanded filter groups
    const savedFilterGroups = localStorage.getItem("contacts_filterGroups");
    if (savedFilterGroups) {
      try {
        const parsedGroups = JSON.parse(savedFilterGroups);
        setFilterGroups((currentGroups) =>
          currentGroups.map((group) => {
            const savedGroup = parsedGroups.find(
              (g: FilterGroup) => g.id === group.id
            );
            return savedGroup
              ? { ...group, expanded: savedGroup.expanded }
              : group;
          })
        );
      } catch (err) {
        console.error("Failed to parse saved filter groups", err);
      }
    }
  }, []);

  // Save column visibility whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "contacts_columnVisibility",
      JSON.stringify(columnVisibility)
    );
  }, [columnVisibility]);

  // Save filter sidebar state whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "contacts_showFilterSidebar",
      String(showFilterSidebar)
    );
  }, [showFilterSidebar]);

  // Save applied filters whenever they change
  useEffect(() => {
    localStorage.setItem(
      "contacts_appliedFilters",
      JSON.stringify(appliedFilters)
    );
  }, [appliedFilters]);

  // Save filter groups expanded state whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "contacts_filterGroups",
      JSON.stringify(
        filterGroups.map((group) => ({
          id: group.id,
          expanded: group.expanded,
        }))
      )
    );
  }, [filterGroups]);

  // Save search query whenever it changes
  useEffect(() => {
    localStorage.setItem("contacts_searchQuery", searchQuery);
  }, [searchQuery]);

  // Save pagination page size whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "contacts_paginationPageSize",
      pagination.pageSize.toString()
    );
  }, [pagination.pageSize]);

  // Toggle a filter group's expanded state
  const toggleFilterGroup = (groupId: string) => {
    setFilterGroups(
      filterGroups.map((group) =>
        group.id === groupId ? { ...group, expanded: !group.expanded } : group
      )
    );
  };

  // Handle column visibility change
  const handleColumnVisibilityChange = (
    visibility: Record<string, boolean>
  ) => {
    setColumnVisibility(visibility);
  };

  // Fetch contacts data on initial load and when search or applied filters change
  useEffect(() => {
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    // Always fetch on initial load or when page changes
    if (!isNaN(page) && page > 0) {
      setPagination((prev) => ({ ...prev, page }));
      fetchContacts(page);
    }

    // Store current values for comparison
    prevSearchParamsRef.current = searchParams.toString();
    prevSearchQueryRef.current = searchQuery;
    prevFiltersRef.current = [...appliedFilters];
  }, [searchParams, searchQuery, appliedFilters]); // Removed pagination.pageSize from dependencies

  // Fetch stats for the dashboard cards
  useEffect(() => {
    fetchContactStats();
  }, []);

  const fetchContactStats = async () => {
    try {
      const response = await fetch("/api/contacts/stats");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch contact statistics"
        );
      }
      const data = await response.json();
      setTotalContacts(data.total || 0);
      setActiveContacts(data.active || 0);
      setInactiveContacts(data.inactive || 0);
    } catch (err: any) {
      console.error("Error fetching contact stats:", err);
    }
  };

  const fetchContacts = async (page = 1) => {
    // Set loading state but don't block UI completely
    setIsLoading(true);
    setError("");

    try {
      // Store the previous contacts to prevent layout shifts during loading
      const prevContacts = [...contacts];

      // Build the query string with pagination, search, and filter params
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pagination.pageSize.toString());

      if (searchQuery) {
        params.set("search", searchQuery);
      }

      // Add applied filters to query params
      appliedFilters.forEach((filter) => {
        // Clean filter value from any array formatting characters if it's seniority
        let filterValue = filter.value;
        if (filter.groupId === "seniority") {
          filterValue = filterValue.replace(/[\[\]']/g, "");
        }

        // If we already have this filter type, we append to it
        const existingValue = params.get(filter.groupId);
        if (existingValue) {
          params.set(filter.groupId, `${existingValue},${filterValue}`);
        } else {
          params.set(filter.groupId, filterValue);
        }
      });

      const response = await fetch(`/api/contacts?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const data = await response.json();

      // Smoothly update state to prevent jarring UX
      setContacts(data.contacts || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        pages: data.pagination.pages,
        page: data.pagination.page,
        // Don't update pageSize here to prevent resetting
      }));

      // If we don't have stats yet, calculate them from this response
      if (totalContacts === 0) {
        setTotalContacts(data.pagination.total);

        // If we need detailed stats (active vs inactive), we'll need to fetch them separately
        fetchContactStats();
      }
    } catch (err: any) {
      console.error("Error fetching contacts:", err);
      setError(err.message || "Failed to load contacts");
      setContacts([]);
    } finally {
      // Small timeout to prevent flickering for fast responses
      setTimeout(() => {
        setIsLoading(false);
      }, 200);
    }
  };

  // Apply a filter
  const applyFilter = (
    groupId: string,
    filterId: string,
    label: string,
    value: string
  ) => {
    // Check if filter is already applied
    const filterExists = appliedFilters.some(
      (filter) => filter.groupId === groupId && filter.filterId === filterId
    );

    if (!filterExists) {
      setAppliedFilters([
        ...appliedFilters,
        { groupId, filterId, label, value },
      ]);
      goToPage(1); // Reset to first page when changing filters
    } else {
      removeFilter(groupId, filterId);
    }
  };

  // Remove a filter
  const removeFilter = (groupId: string, filterId: string) => {
    setAppliedFilters(
      appliedFilters.filter(
        (filter) =>
          !(filter.groupId === groupId && filter.filterId === filterId)
      )
    );
    goToPage(1); // Reset to first page when changing filters
  };

  // Clear all filters
  const clearAllFilters = () => {
    setAppliedFilters([]);
    goToPage(1);
  };

  // Navigate to a specific page
  const goToPage = (page: number) => {
    if (page < 1 || (pagination.pages > 0 && page > pagination.pages)) return;

    // Update local state immediately for better UX
    setPagination((prev) => ({ ...prev, page }));

    // Update URL without causing a full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.replace(`/dashboard/contacts?${params.toString()}`, {
      scroll: false, // Prevent scrolling to top
    });

    // Fetch new data
    fetchContacts(page);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goToPage(1); // Reset to first page when searching
  };

  // Function to capitalize text
  const capitalize = (text: string) => {
    if (!text) return "";
    // Remove array formatting characters if present
    const cleanText = text.replace(/[\[\]']/g, "");
    return cleanText
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Function to format phone numbers
  const formatPhone = (phone: string) => {
    if (!phone) return "";

    // Simple US phone number formatting
    if (phone.replace(/\D/g, "").length === 10) {
      const cleaned = phone.replace(/\D/g, "");
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(
        3,
        6
      )}-${cleaned.substring(6, 10)}`;
    }

    return phone;
  };

  // Function to handle opening contact details dialog
  const handleViewContactDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setContactDialogOpen(true);
  };

  // Contact detail section component
  const ContactDetailSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </h3>
        <div className="bg-muted/30 rounded-md p-3">{children}</div>
      </div>
    );
  };

  // Contact info item component
  const ContactInfoItem = ({
    icon,
    label,
    value,
    href,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number | undefined | null;
    href?: string;
  }) => {
    if (!value) return null;

    const content = (
      <div className="flex items-center gap-2 py-1">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </div>
    );

    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-muted/50 rounded px-1"
        >
          <div className="flex items-center justify-between">
            {content}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </div>
        </a>
      );
    }

    return content;
  };

  const columns: ColumnDef<Contact>[] = [
    // Select column
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    // Email column
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="font-medium truncate max-w-[180px]">
          <Button
            variant="link"
            className="p-0 h-auto font-medium truncate"
            onClick={() => handleViewContactDetails(row.original)}
          >
            {row.getValue("email")}
          </Button>
        </div>
      ),
    },

    // Name columns
    {
      accessorKey: "firstName",
      header: "First Name",
      cell: ({ row }) => {
        const firstName = row.getValue("firstName") as string | undefined;
        return (
          <div className="truncate max-w-[120px]">
            {firstName ? capitalize(firstName) : "—"}
          </div>
        );
      },
    },
    {
      accessorKey: "lastName",
      header: "Last Name",
      cell: ({ row }) => {
        const lastName = row.getValue("lastName") as string | undefined;
        return (
          <div className="truncate max-w-[120px]">
            {lastName ? capitalize(lastName) : "—"}
          </div>
        );
      },
    },

    // Job Title column
    {
      accessorKey: "jobTitle",
      header: "Job Title",
      cell: ({ row }) => {
        const jobTitle = row.getValue("jobTitle") as string | undefined;
        return (
          <div className="flex items-center max-w-[180px]">
            {jobTitle ? (
              <div className="flex items-center truncate">
                <Briefcase className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                <span className="capitalize truncate">
                  {capitalize(jobTitle)}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        );
      },
    },

    // Seniority column
    {
      accessorKey: "seniority",
      header: "Seniority",
      cell: ({ row }) => {
        const seniority = row.getValue("seniority") as string | undefined;
        return (
          <div className="truncate max-w-[100px]">
            {seniority ? capitalize(seniority).replace(/[\[\]']/g, "") : "—"}
          </div>
        );
      },
    },

    // Department column
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => {
        const department = row.getValue("department") as string | undefined;
        return (
          <div className="truncate max-w-[120px]">
            {department ? capitalize(department) : "—"}
          </div>
        );
      },
    },

    // Company column
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => {
        const company = row.getValue("company") as string | undefined;
        return (
          <div className="flex items-center max-w-[180px]">
            {company ? (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="flex items-center cursor-pointer truncate">
                    <Building className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="capitalize truncate">
                      {capitalize(company)}
                    </span>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">
                      {capitalize(company)}
                    </h4>
                    {row.original.companySize && (
                      <p className="text-xs text-muted-foreground">
                        Size: {row.original.companySize}
                      </p>
                    )}
                    {row.original.industry && (
                      <p className="text-xs text-muted-foreground">
                        Industry: {capitalize(row.original.industry)}
                      </p>
                    )}
                    {row.original.companyWebsite && (
                      <a
                        href={row.original.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <Globe className="h-3 w-3" /> Visit website
                      </a>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        );
      },
    },

    // Industry column
    {
      accessorKey: "industry",
      header: "Industry",
      cell: ({ row }) => {
        const industry = row.getValue("industry") as string | undefined;
        return (
          <div className="truncate max-w-[150px]">
            {industry ? capitalize(industry) : "—"}
          </div>
        );
      },
    },

    // Phone column
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string | undefined;
        return (
          <div className="flex items-center max-w-[150px] truncate">
            {phone ? (
              <>
                <Phone className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{formatPhone(phone)}</span>
              </>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        );
      },
    },

    // Location column
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const contact = row.original;
        const location = [
          contact.city ? capitalize(contact.city) : null,
          contact.state ? capitalize(contact.state) : null,
          contact.country ? capitalize(contact.country) : null,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <div className="flex items-center max-w-[180px]">
            {location ? (
              <div className="flex items-center truncate">
                <MapPin className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        );
      },
    },

    // Source column
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const source = row.getValue("source") as string | undefined;
        return (
          <div className="max-w-[120px]">
            {source ? (
              <Badge variant="outline" className="capitalize truncate">
                {capitalize(source)}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        );
      },
    },

    // Tags column
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[];

        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {tags && tags.length > 0 ? (
              tags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs capitalize truncate max-w-[60px]"
                >
                  <Tag className="mr-1 h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{capitalize(tag)}</span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
            {tags && tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },

    // Actions column
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original;

        return (
          <div className="flex justify-end">
            <TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleViewContactDetails(contact)}
                  >
                    <Info className="mr-2 h-4 w-4" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(contact.email)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Copy email
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Edit contact
                  </DropdownMenuItem>

                  {contact.linkedinUrl && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (contact.linkedinUrl) {
                          window.open(
                            contact.linkedinUrl.startsWith("http")
                              ? contact.linkedinUrl
                              : `https://${contact.linkedinUrl}`,
                            "_blank"
                          );
                        }
                      }}
                    >
                      <Linkedin className="mr-2 h-4 w-4" />
                      View LinkedIn
                    </DropdownMenuItem>
                  )}

                  {contact.twitterHandle && (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          contact.twitterHandle?.startsWith("http")
                            ? contact.twitterHandle
                            : contact.twitterHandle?.includes("twitter.com")
                            ? `https://${contact.twitterHandle?.replace(
                                "@",
                                ""
                              )}`
                            : `https://twitter.com/${contact.twitterHandle?.replace(
                                "@",
                                ""
                              )}`
                        )
                      }
                    >
                      <Twitter className="mr-2 h-4 w-4" />
                      View Twitter
                    </DropdownMenuItem>
                  )}

                  {contact.companyWebsite && (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          contact.companyWebsite?.startsWith("http")
                            ? contact.companyWebsite
                            : `https://${contact.companyWebsite}`,
                          "_blank"
                        )
                      }
                    >
                      <Building className="mr-2 h-4 w-4" />
                      Visit company website
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Tag className="mr-2 h-4 w-4" />
                      <span>Manage tags</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>Add tag</DropdownMenuItem>
                        {contact.tags && contact.tags.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            {contact.tags.map((tag, index) => (
                              <DropdownMenuItem key={index}>
                                Remove "{capitalize(tag)}"
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  // Contact detail status badge
  const ContactStatusBadge = ({ status }: { status: string }) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> =
      {
        active: {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        },
        unsubscribed: {
          color: "bg-amber-100 text-amber-800 border-amber-200",
          icon: <XCircle className="h-3 w-3 mr-1" />,
        },
        bounced: {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        },
        verified: {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <BadgeCheck className="h-3 w-3 mr-1" />,
        },
        unverified: {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <Info className="h-3 w-3 mr-1" />,
        },
        invalid: {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        },
      };

    const { color, icon } =
      statusMap[status.toLowerCase()] || statusMap.unverified;

    return (
      <Badge variant="outline" className={`flex items-center ${color}`}>
        {icon}
        <span className="capitalize">{capitalize(status)}</span>
      </Badge>
    );
  };

  // Filter the options based on search input
  const getFilteredOptions = (options: FilterOption[], search: string) => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  };

  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCount, setExportCount] = useState(0);

  // Function to handle exporting contacts based on current filters
  const handleExportContacts = async (skipConfirmation = false) => {
    try {
      setIsExporting(true);

      // Build query string with all current filters
      const params = new URLSearchParams();

      if (searchQuery) {
        params.set("search", searchQuery);
      }

      // Add applied filters to query params
      appliedFilters.forEach((filter) => {
        // Clean filter value from any array formatting characters if it's seniority
        let filterValue = filter.value;
        if (filter.groupId === "seniority") {
          filterValue = filterValue.replace(/[\[\]']/g, "");
        }

        // If we already have this filter type, we append to it
        const existingValue = params.get(filter.groupId);
        if (existingValue) {
          params.set(filter.groupId, `${existingValue},${filterValue}`);
        } else {
          params.set(filter.groupId, filterValue);
        }
      });

      // Call the export API with the filters
      const response = await fetch(`/api/contacts/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to export contacts");
      }

      const data = await response.json();

      if (data.contacts && data.contacts.length > 0) {
        // Generate date string for filename
        const date = new Date().toISOString().split("T")[0];
        exportToCSV(data.contacts, `contacts-export-${date}.csv`);

        // Show success message with count and limit info
        if (data.limitExceeded) {
          toast({
            title: "Export limit reached",
            description: `${data.contacts.length} of ${data.count} contacts exported to CSV. Export limit is ${data.limit} contacts.`,
            duration: 5000,
          });
        } else {
          toast({
            title: "Export successful",
            description: `${data.contacts.length} contacts exported to CSV`,
            duration: 3000,
          });
        }
      } else {
        throw new Error("No contacts found to export");
      }
    } catch (err: any) {
      console.error("Error exporting contacts:", err);
      setError(err.message || "Failed to export contacts");

      toast({
        title: "Export failed",
        description: err.message || "Failed to export contacts",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
    }
  };

  // Pagination page size change handler
  const handlePaginationPageSizeChange = (pageSize: number) => {
    // Prevent updates during loading
    if (isLoading) return;

    // Update state first to prevent flickering
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));

    // Save to localStorage
    localStorage.setItem("contacts_paginationPageSize", pageSize.toString());

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.set("pageSize", pageSize.toString());
    router.replace(`/dashboard/contacts?${params.toString()}`, {
      scroll: false,
    });

    // Fetch new data with updated page size
    fetchContacts(1);
  };

  // Add refs to track previous values to prevent unnecessary fetches
  const prevSearchParamsRef = useRef(searchParams.toString());
  const prevSearchQueryRef = useRef(searchQuery);
  const prevFiltersRef = useRef<AppliedFilter[]>([]);

  return (
    <>
      <div className="flex">
        {/* Filter Sidebar */}
        {showFilterSidebar && (
          <div className="w-72 shrink-0 border-r h-[calc(100vh-72px)] overflow-auto bg-background">
            <div className="sticky top-0 bg-background pt-4 pb-3 px-4 flex justify-between items-center border-b z-10">
              <h2 className="font-semibold text-lg">Filters</h2>
              {appliedFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={clearAllFilters}
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search filters..."
                  className="pl-8 bg-background/50 border-muted"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>

              {appliedFilters.length > 0 && (
                <div className="mb-4 bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <p className="text-xs font-medium mb-2 text-muted-foreground flex items-center">
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    Applied Filters
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {appliedFilters.map((filter, index) => (
                      <Badge
                        key={`${filter.groupId}-${filter.filterId}-${index}`}
                        variant="secondary"
                        className="flex items-center gap-1 bg-background border-muted"
                      >
                        {filter.label}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() =>
                            removeFilter(filter.groupId, filter.filterId)
                          }
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {filterGroups.map((group) => {
                const filteredOptions = getFilteredOptions(
                  group.options,
                  filterSearch
                );
                // Skip rendering if no options match the search
                if (filteredOptions.length === 0 && filterSearch.trim() !== "")
                  return null;

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "border rounded-lg overflow-hidden bg-background shadow-sm",
                      group.expanded ? "ring-1 ring-primary/10" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30",
                        group.expanded ? "border-b border-border/50" : ""
                      )}
                      onClick={() => toggleFilterGroup(group.id)}
                    >
                      <h3 className="font-medium text-sm">{group.name}</h3>
                      <div className="flex items-center">
                        {filterSearch.trim() !== "" &&
                          filteredOptions.length > 0 && (
                            <Badge variant="outline" className="text-xs mr-2">
                              {filteredOptions.length}
                            </Badge>
                          )}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            group.expanded ? "transform rotate-180" : ""
                          )}
                        />
                      </div>
                    </div>

                    {group.expanded && (
                      <div className="px-2 py-2 space-y-0.5 max-h-[250px] overflow-y-auto">
                        {filteredOptions.map((option) => {
                          const isSelected = appliedFilters.some(
                            (filter) =>
                              filter.groupId === group.id &&
                              filter.filterId === option.id
                          );
                          return (
                            <div
                              key={option.id}
                              className={cn(
                                "flex items-center py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors",
                                isSelected
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-muted/60"
                              )}
                              onClick={() =>
                                applyFilter(
                                  group.id,
                                  option.id,
                                  option.label,
                                  option.value
                                )
                              }
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/20"
                                )}
                              >
                                {isSelected && (
                                  <CheckIcon className="h-3 w-3" />
                                )}
                              </div>
                              <span>{option.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-6">
          <div className="space-y-6 max-w-full">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your contact list and subscriber data
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilterSidebar(!showFilterSidebar)}
                  className="relative"
                >
                  <Filter className="h-4 w-4" />
                  {appliedFilters.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
                      {appliedFilters.length}
                    </span>
                  )}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchContacts(pagination.page)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh data</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button onClick={() => router.push("/dashboard/contacts/new")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 p-3 rounded-md flex items-center text-destructive border border-destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Total Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalContacts}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated just now
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Active Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {activeContacts}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalContacts > 0
                      ? `${Math.round(
                          (activeContacts / totalContacts) * 100
                        )}% of total contacts`
                      : "No contacts"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Unsubscribed/Bounced</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">
                    {inactiveContacts}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalContacts > 0
                      ? `${Math.round(
                          (inactiveContacts / totalContacts) * 100
                        )}% of total contacts`
                      : "No contacts"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>Contact List</CardTitle>
                <CardDescription>
                  View and manage all your contacts in one place
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form
                  onSubmit={handleSearch}
                  className="mb-4 px-6 pt-6 flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search contacts..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleExportContacts()}
                            disabled={isExporting}
                            className="relative"
                          >
                            {isExporting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isExporting
                            ? "Exporting contacts..."
                            : `Export all${
                                appliedFilters.length > 0 ? " filtered" : ""
                              } contacts`}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push("/dashboard/imports")}
                          >
                            <FileUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Import contacts</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </form>

                {/* Applied filters */}
                {appliedFilters.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 px-6">
                    <span className="text-sm text-muted-foreground">
                      Filters:
                    </span>
                    {appliedFilters.map((filter, index) => (
                      <Badge
                        key={`${filter.groupId}-${filter.filterId}-${index}`}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {filter.label}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() =>
                            removeFilter(filter.groupId, filter.filterId)
                          }
                        />
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={clearAllFilters}
                    >
                      Clear all
                    </Button>
                  </div>
                )}

                {selectedRows.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-2">
                    <p className="text-sm">
                      <span className="font-medium">{selectedRows.length}</span>{" "}
                      items selected
                    </p>
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        Add tag
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}

                {isLoading && contacts.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : contacts.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No contacts found</h3>
                    <p className="text-muted-foreground mt-1 mb-4">
                      {searchQuery || appliedFilters.length > 0
                        ? "Try adjusting your search or filter criteria"
                        : "Get started by adding your first contact."}
                    </p>
                    {!searchQuery && appliedFilters.length === 0 && (
                      <Button
                        onClick={() => router.push("/dashboard/contacts/new")}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="min-h-[500px] relative">
                    {/* Table with fixed height to prevent flickering */}
                    <div className="overflow-x-auto max-w-full px-6">
                      {isLoading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 pointer-events-none">
                          <div className="bg-background/90 p-2 rounded-full">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        </div>
                      )}
                      <div
                        className={`relative ${
                          isLoading ? "opacity-60" : ""
                        } transition-opacity duration-200`}
                      >
                        <DataTable
                          columns={columns}
                          data={
                            contacts.length > 0
                              ? contacts
                              : Array(pagination.pageSize).fill({
                                  id: "",
                                  email: "loading@example.com",
                                  firstName: "",
                                  lastName: "",
                                  tags: [],
                                  jobTitle: "",
                                  company: "",
                                  source: "",
                                } as Contact)
                          }
                          filterColumn="email"
                          initialColumnVisibility={columnVisibility}
                          onColumnVisibilityChange={
                            handleColumnVisibilityChange
                          }
                          pageSize={pagination.pageSize}
                          pageIndex={pagination.page - 1} // Convert 1-based to 0-based indexing
                          pageCount={pagination.pages}
                          onPaginationChange={(pageIndex, pageSize) => {
                            // Prevent updates during loading
                            if (isLoading) return;

                            // Handle page size change
                            if (pageSize !== pagination.pageSize) {
                              handlePaginationPageSizeChange(pageSize);
                              return;
                            }

                            // Handle page change
                            const newPage = pageIndex + 1; // Convert 0-based to 1-based indexing
                            if (newPage !== pagination.page) {
                              goToPage(newPage);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between px-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          Rows per page:
                        </span>
                        <Select
                          value={pagination.pageSize.toString()}
                          onValueChange={(value) =>
                            handlePaginationPageSizeChange(parseInt(value))
                          }
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue
                              placeholder={pagination.pageSize.toString()}
                            />
                          </SelectTrigger>
                          <SelectContent side="top">
                            {[10, 20, 50, 100].map((pageSize) => (
                              <SelectItem
                                key={pageSize}
                                value={pageSize.toString()}
                              >
                                {pageSize}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        {isLoading && (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        )}
                        {pagination.total > 0 ? (
                          <>
                            Showing{" "}
                            {(pagination.page - 1) * pagination.pageSize + 1}-
                            {Math.min(
                              pagination.page * pagination.pageSize,
                              pagination.total
                            )}{" "}
                            of {pagination.total} contacts
                          </>
                        ) : (
                          "No contacts found"
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Details Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          {selectedContact && (
            <>
              <DialogHeader className="pb-4 border-b">
                <DialogTitle>
                  <span className="text-xl font-semibold capitalize">
                    {selectedContact.firstName && selectedContact.lastName
                      ? `${capitalize(selectedContact.firstName)} ${capitalize(
                          selectedContact.lastName
                        )}`
                      : selectedContact.email}
                  </span>
                </DialogTitle>
                <DialogDescription className="flex flex-col space-y-1 pt-1">
                  <div className="text-sm font-medium">
                    {selectedContact.email}
                  </div>
                  {selectedContact.jobTitle && (
                    <div className="text-sm flex items-center">
                      <Briefcase className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="capitalize">
                        {capitalize(selectedContact.jobTitle)}
                        {selectedContact.company && (
                          <>
                            {" "}
                            at{" "}
                            <span className="font-medium capitalize">
                              {capitalize(selectedContact.company)}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="py-6">
                {/* Contact profile header with avatar/initials */}
                <div className="flex items-center mb-6 px-1">
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mr-4">
                    {selectedContact.firstName
                      ? selectedContact.firstName.charAt(0).toUpperCase()
                      : selectedContact.email.charAt(0).toUpperCase()}
                    {selectedContact.lastName
                      ? selectedContact.lastName.charAt(0).toUpperCase()
                      : ""}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedContact.firstName && selectedContact.lastName
                        ? `${capitalize(
                            selectedContact.firstName
                          )} ${capitalize(selectedContact.lastName)}`
                        : selectedContact.email}
                    </h3>
                    {selectedContact.jobTitle && (
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span className="capitalize">
                          {capitalize(selectedContact.jobTitle)}
                          {selectedContact.company && (
                            <>
                              {" "}
                              at{" "}
                              <span className="font-medium">
                                {capitalize(selectedContact.company)}
                              </span>
                            </>
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-4 bg-muted/5 p-4 rounded-lg border">
                    <h3 className="font-medium text-sm flex items-center gap-2 pb-2 border-b">
                      <Mail className="h-4 w-4 text-primary" />
                      Contact Details
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedContact.email}</p>
                        </div>
                      </div>

                      {selectedContact.phone && (
                        <div className="flex items-start">
                          <Phone className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Phone
                            </p>
                            <p className="font-medium">
                              {formatPhone(selectedContact.phone)}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.linkedinUrl && (
                        <div className="flex items-start">
                          <Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              LinkedIn
                            </p>
                            <a
                              href={
                                selectedContact.linkedinUrl.startsWith("http")
                                  ? selectedContact.linkedinUrl
                                  : `https://${selectedContact.linkedinUrl}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline flex items-center"
                            >
                              View Profile
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      )}

                      {selectedContact.twitterHandle && (
                        <div className="flex items-start">
                          <Twitter className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Twitter
                            </p>
                            <a
                              href={
                                selectedContact.twitterHandle?.startsWith(
                                  "http"
                                )
                                  ? selectedContact.twitterHandle
                                  : selectedContact.twitterHandle?.includes(
                                      "twitter.com"
                                    )
                                  ? `https://${selectedContact.twitterHandle?.replace(
                                      "@",
                                      ""
                                    )}`
                                  : `https://twitter.com/${selectedContact.twitterHandle?.replace(
                                      "@",
                                      ""
                                    )}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline flex items-center"
                            >
                              {selectedContact.twitterHandle}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-4 bg-muted/5 p-4 rounded-lg border">
                    <h3 className="font-medium text-sm flex items-center gap-2 pb-2 border-b">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Professional Info
                    </h3>

                    <div className="space-y-3">
                      {selectedContact.jobTitle && (
                        <div className="flex items-start">
                          <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Job Title
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.jobTitle)}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.department && (
                        <div className="flex items-start">
                          <Users className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Department
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.department)}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.seniority && (
                        <div className="flex items-start">
                          <ChevronRightIcon className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Seniority
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.seniority).replace(
                                /[\[\]']/g,
                                ""
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Information */}
                  <div className="space-y-4 bg-muted/5 p-4 rounded-lg border">
                    <h3 className="font-medium text-sm flex items-center gap-2 pb-2 border-b">
                      <Building className="h-4 w-4 text-primary" />
                      Company Information
                    </h3>

                    <div className="space-y-3">
                      {selectedContact.company && (
                        <div className="flex items-start">
                          <Building className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Company
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.company)}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.industry && (
                        <div className="flex items-start">
                          <Globe className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Industry
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.industry)}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.companySize && (
                        <div className="flex items-start">
                          <Users className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Company Size
                            </p>
                            <p className="font-medium">
                              {selectedContact.companySize}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.companyWebsite && (
                        <div className="flex items-start">
                          <Link className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Website
                            </p>
                            <a
                              href={
                                selectedContact.companyWebsite.startsWith(
                                  "http"
                                )
                                  ? selectedContact.companyWebsite
                                  : `https://${selectedContact.companyWebsite}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline flex items-center"
                            >
                              {selectedContact.companyWebsite.replace(
                                /^https?:\/\//i,
                                ""
                              )}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-4 bg-muted/5 p-4 rounded-lg border">
                    <h3 className="font-medium text-sm flex items-center gap-2 pb-2 border-b">
                      <MapPin className="h-4 w-4 text-primary" />
                      Location
                    </h3>

                    <div className="space-y-3">
                      {selectedContact.city && (
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              City
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.city)}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.state && (
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              State/Province
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.state)}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedContact.country && (
                        <div className="flex items-start">
                          <Globe className="h-4 w-4 text-muted-foreground mt-0.5 mr-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Country
                            </p>
                            <p className="font-medium capitalize">
                              {capitalize(selectedContact.country)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags and Source */}
                  <div className="col-span-1 md:col-span-2 space-y-4 bg-muted/5 p-4 rounded-lg border">
                    <h3 className="font-medium text-sm flex items-center gap-2 pb-2 border-b">
                      <Tag className="h-4 w-4 text-primary" />
                      Tags & Source
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedContact.tags &&
                          selectedContact.tags.length > 0 ? (
                            selectedContact.tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="capitalize text-xs py-1"
                              >
                                <Tag className="mr-1 h-3 w-3" />
                                {capitalize(tag)}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No tags
                            </p>
                          )}
                        </div>
                      </div>

                      {selectedContact.source && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Source
                          </p>
                          <Badge variant="outline" className="capitalize">
                            {capitalize(selectedContact.source)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t mt-2">
                <div className="flex gap-2 w-full justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setContactDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Confirmation Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Contacts</DialogTitle>
            <DialogDescription>
              You are about to export {exportCount} contacts. This might take a
              while and generate a large file.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => handleExportContacts(true)}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {exportCount} contacts
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
