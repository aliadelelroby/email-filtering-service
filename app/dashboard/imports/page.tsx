"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { FileUpload } from "@/components/email/file-upload";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Search,
  Plus,
  ArrowUpCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { FileUploadWithMapping } from "@/components/email/file-upload-with-mapping";

interface FileImport {
  _id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalRecords?: number;
  processedRecords?: number;
  successRecords?: number;
  errorRecords?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4" />;
    case "processing":
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "failed":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return null;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "processing":
      return "secondary";
    case "pending":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

export default function ImportsPage() {
  const [imports, setImports] = useState<FileImport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Add a ref to track current imports
  const importsRef = useRef<FileImport[]>([]);

  // Add a ref to track active imports that need monitoring
  const activeImportsRef = useRef<Set<string>>(new Set());

  // Keep importsRef updated when imports changes
  useEffect(() => {
    importsRef.current = imports;
  }, [imports]);

  // Stats
  const [totalImports, setTotalImports] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [successRecords, setSuccessRecords] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set up polling without imports as a dependency
  useEffect(() => {
    fetchImports();

    // Polling mechanism for checking processing imports
    let pollingInterval: NodeJS.Timeout | null = null;

    const pollProcessingImports = () => {
      // Use importsRef.current instead of imports directly
      const currentImports = importsRef.current;

      // Poll all imports that are in the activeImports set
      if (activeImportsRef.current.size > 0) {
        // Convert Set to Array to iterate
        Array.from(activeImportsRef.current).forEach((importId) => {
          pollImportStatus(importId);
        });
        return true; // We have active imports to poll
      }

      // Also check for any imports that might be processing but not in our active set
      const processingImports = currentImports.filter(
        (imp) => imp.status === "processing" || imp.status === "pending"
      );

      if (processingImports.length > 0) {
        processingImports.forEach((imp) => {
          // Add to active set and poll
          activeImportsRef.current.add(imp._id);
          pollImportStatus(imp._id);
        });
        return true;
      }

      return false;
    };

    const startPolling = () => {
      // Clear any existing interval
      if (pollingInterval) clearInterval(pollingInterval);

      // Set up a new interval
      pollingInterval = setInterval(() => {
        const hasProcessingImports = pollProcessingImports();

        // Keep polling even if no active imports, as we might miss status updates
        // The interval will be cleaned up when component unmounts
      }, 3000);
    };

    // Start polling on mount
    startPolling();

    // Clean up on unmount
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []); // No dependency on imports

  const fetchImports = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError("");

    try {
      const response = await fetch("/api/imports");

      if (!response.ok) {
        throw new Error("Failed to fetch imports");
      }

      const data = await response.json();
      setImports(data.imports || []);

      // Calculate stats
      const total = data.imports.length;
      const records = data.imports.reduce(
        (sum: number, imp: FileImport) => sum + (imp.totalRecords || 0),
        0
      );
      const successful = data.imports.reduce(
        (sum: number, imp: FileImport) => sum + (imp.successRecords || 0),
        0
      );

      setTotalImports(total);
      setTotalRecords(records);
      setSuccessRecords(successful);
    } catch (err: any) {
      console.error("Error fetching imports:", err);
      setError(err.message || "Failed to load imports");
      setImports([]);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  /**
   * Polls for the status of a specific import
   */
  const pollImportStatus = async (importId: string) => {
    try {
      const response = await fetch(`/api/imports/status/${importId}`);

      if (!response.ok) {
        console.error(`Failed to fetch status for import ${importId}`);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Extract import data with default values
        const importData = data.import || {};

        // Log status changes for debugging using the ref
        const currentImports = importsRef.current;
        const existingImport = currentImports.find(
          (imp) => imp._id === importId
        );

        if (existingImport && existingImport.status !== importData.status) {
          console.log(
            `Import ${importId} status changed: ${existingImport.status} -> ${importData.status}`
          );
          console.log(`Import data:`, {
            totalRecords: importData.totalRecords,
            processedRecords: importData.processedRecords,
            successRecords: importData.successRecords,
            errorRecords: importData.errorRecords,
          });
        }

        // Update the specific import in the state
        setImports((prevImports) =>
          prevImports.map((imp) =>
            imp._id === importId
              ? {
                  ...imp,
                  fileName: importData.fileName || imp.fileName,
                  fileType: importData.fileType || imp.fileType,
                  status: importData.status || imp.status,
                  totalRecords:
                    importData.totalRecords !== undefined
                      ? importData.totalRecords
                      : imp.totalRecords,
                  processedRecords:
                    importData.processedRecords !== undefined
                      ? importData.processedRecords
                      : imp.processedRecords,
                  successRecords:
                    importData.successRecords !== undefined
                      ? importData.successRecords
                      : imp.successRecords,
                  errorRecords:
                    importData.errorRecords !== undefined
                      ? importData.errorRecords
                      : imp.errorRecords,
                  completedAt: importData.completedAt || imp.completedAt,
                }
              : imp
          )
        );

        // If the status changed to completed or failed, update stats and remove from active imports
        if (
          importData.status === "completed" ||
          importData.status === "failed"
        ) {
          // Remove from active imports that need polling
          activeImportsRef.current.delete(importId);

          // Refresh all imports to get accurate statistics
          fetchImports(false);
        }
      }
    } catch (error) {
      console.error(`Error polling import status for ${importId}:`, error);
    }
  };

  /**
   * Handles deleting an import file
   */
  const handleDeleteImport = async (importId: string) => {
    if (!importId) {
      toast({
        title: "Error",
        description: "Cannot delete import: Invalid import ID",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(importId);

    try {
      const response = await fetch(`/api/imports/${importId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete import");
      }

      // Remove from local state
      setImports((prevImports) =>
        prevImports.filter((imp) => imp._id !== importId)
      );

      toast({
        title: "Import deleted",
        description: "The import has been successfully deleted.",
      });

      // Refresh stats
      const updatedImports = imports.filter((imp) => imp._id !== importId);
      setTotalImports(updatedImports.length);
      setTotalRecords(
        updatedImports.reduce((sum, imp) => sum + (imp.totalRecords || 0), 0)
      );
      setSuccessRecords(
        updatedImports.reduce((sum, imp) => sum + (imp.successRecords || 0), 0)
      );
    } catch (err: any) {
      console.error("Error deleting import:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete import",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  /**
   * Downloads the error log for a completed import
   */
  const handleDownloadErrorLog = async (importId: string, fileName: string) => {
    if (!importId) {
      toast({
        title: "Error",
        description: "Cannot download error log: Invalid import ID",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(importId);

    try {
      const response = await fetch(`/api/imports/${importId}/errors`);

      if (!response.ok) {
        throw new Error("Failed to download error log");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.split(".")[0]}-errors.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "The error log is being downloaded.",
      });
    } catch (err: any) {
      console.error("Error downloading error log:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to download error log",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  // For stats calculations when empty
  const lastImportDate =
    imports.length > 0 ? new Date(imports[0].createdAt) : null;

  // Filter imports based on search and status
  const filteredImports = imports.filter((imp) =>
    imp.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelected = async (file: File) => {
    setIsUploading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsUploading(false);
  };

  // Empty state UI for the file list
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-bold">No imports yet</h3>
      <p className="text-muted-foreground mt-1 mb-4">
        Import your first file to get started.
      </p>
      <Button>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Import File
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Imports</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage your contact data imports
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Learn about importing data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Total Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalImports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last imported{" "}
              {lastImportDate && formatDistanceToNow(lastImportDate)} ago
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Successful Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {successRecords}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From all imports
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Error Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {imports.reduce((acc, imp) => acc + (imp.errorRecords || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all imports
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileUploadWithMapping
          onImportComplete={(
            importId: string,
            fileName: string,
            fileSize: number
          ) => {
            // Add import to activeImports set for guaranteed polling
            activeImportsRef.current.add(importId);

            // Add a temporary import entry with pending status and better defaults
            const tempImport: FileImport = {
              _id: importId,
              fileName: fileName || "Processing...",
              fileSize: fileSize || 0,
              fileType: fileName ? fileName.split(".").pop() || "" : "",
              status: "pending",
              processedRecords: 0,
              successRecords: 0,
              errorRecords: 0,
              createdAt: new Date().toISOString(),
            };

            setImports((prevImports) => [tempImport, ...prevImports]);

            // Start polling for this specific import immediately
            pollImportStatus(importId);

            // Also fetch all imports after a short delay
            setTimeout(() => fetchImports(false), 1000);

            toast({
              title: "Import started",
              description: "Your file is being processed in the background.",
            });
          }}
        />

        <Card>
          <CardHeader className="bg-muted/50">
            <CardTitle>Import Guidelines</CardTitle>
            <CardDescription>
              Follow these tips for successful imports
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <div className="flex items-start gap-3 py-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Supported File Types</p>
                <p className="text-sm text-muted-foreground">
                  CSV, Excel (.xlsx, .xls), and plain text files
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <ArrowUpDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Required Columns</p>
                <p className="text-sm text-muted-foreground">
                  At minimum, files must include an 'email' column.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Need a Template?</p>
                <p className="text-sm text-muted-foreground">
                  Use our starter template to make sure your data is formatted
                  correctly.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-1">
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Imports</CardTitle>
              <CardDescription>
                View and manage your data imports
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Force refresh all imports
                fetchImports();

                // Also make sure to poll any processing imports
                importsRef.current.forEach((imp) => {
                  if (imp.status === "processing" || imp.status === "pending") {
                    activeImportsRef.current.add(imp._id);
                    pollImportStatus(imp._id);
                  }
                });
              }}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={`h-3 w-3 mr-2 ${
                  isLoading || isRefreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search imports..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredImports.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {renderEmptyState()}
                  </TableCell>
                </TableRow>
              ) : (
                filteredImports.map((fileImport) => (
                  <TableRow
                    key={
                      fileImport._id
                        ? fileImport._id
                        : `import-${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2, 9)}`
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        {fileImport.fileName}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(fileImport.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(fileImport.status)}
                        className="capitalize"
                      >
                        {getStatusIcon(fileImport.status)}
                        <span className="ml-1">{fileImport.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {fileImport.status === "failed" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : fileImport.status === "processing" ||
                        fileImport.status === "pending" ? (
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="text-xs">
                            {fileImport.totalRecords ? (
                              <>
                                {fileImport.processedRecords ?? 0} /{" "}
                                {fileImport.totalRecords}
                              </>
                            ) : (
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                {fileImport.status === "pending"
                                  ? "Preparing..."
                                  : "Processing..."}
                              </span>
                            )}
                          </div>
                          {fileImport.totalRecords ? (
                            <Progress
                              value={
                                ((fileImport.processedRecords ?? 0) /
                                  (fileImport.totalRecords ?? 1)) *
                                100
                              }
                              className="h-1.5"
                            />
                          ) : (
                            <Progress
                              value={15}
                              className="h-1.5 animate-pulse"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center">
                          <span className="text-green-600 font-medium">
                            {fileImport.successRecords ?? 0}
                          </span>
                          /
                          <span className="text-red-600 font-medium">
                            {fileImport.errorRecords ?? 0}
                          </span>
                          <TooltipProvider
                            key={`records-tooltip-${fileImport._id}`}
                          >
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {fileImport.successRecords ?? 0} successful,{" "}
                                {fileImport.errorRecords ?? 0} error records
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(fileImport.fileSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider>
                          {fileImport.status === "completed" && (
                            <Tooltip key={`download-${fileImport._id}`}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleDownloadErrorLog(
                                      fileImport._id,
                                      fileImport.fileName
                                    )
                                  }
                                  disabled={isDownloading === fileImport._id}
                                >
                                  {isDownloading === fileImport._id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Download error log
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip key={`delete-${fileImport._id}`}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() =>
                                  handleDeleteImport(fileImport._id)
                                }
                                disabled={isDeleting === fileImport._id}
                              >
                                {isDeleting === fileImport._id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete import</TooltipContent>
                          </Tooltip>
                          <Tooltip key={`details-${fileImport._id}`}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {filteredImports.length > 0 && (
          <CardFooter className="border-t py-3 px-6">
            <p className="text-sm text-muted-foreground">
              Showing {filteredImports.length} out of {imports.length} imports
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
