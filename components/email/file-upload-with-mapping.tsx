import { useState } from "react";
import { FileUpload } from "@/components/email/file-upload";
import { FieldMapping } from "@/components/email/field-mapping";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface FileUploadWithMappingProps {
  onImportComplete: (
    importId: string,
    fileName: string,
    fileSize: number
  ) => void;
}

export function FileUploadWithMapping({
  onImportComplete,
}: FileUploadWithMappingProps) {
  const [currentStep, setCurrentStep] = useState<
    "upload" | "mapping" | "processing"
  >("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState<{
    fields: string[];
    preview: Record<string, any>[];
    fileName: string;
    fileSize: number;
    fileId?: string;
  } | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  /**
   * Handle file selection and preview
   */
  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append("file", file);

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/imports/preview", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      // Send file for preview
      const response = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              resolve(responseData);
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error(`HTTP error ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      if (!response.success) {
        throw new Error(response.error || "Unknown error");
      }

      // Set file preview data and move to mapping step
      setFilePreview({
        fields: response.fields,
        preview: response.preview,
        fileName: response.fileName,
        fileSize: response.fileSize,
        fileId: response.fileId,
      });

      setCurrentStep("mapping");
    } catch (error: any) {
      console.error("File preview error:", error);
      setError(error.message || "Failed to preview file contents");
      toast({
        title: "Error previewing file",
        description: error.message || "Failed to preview file contents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle field mapping completion
   */
  const handleMappingComplete = async (mapping: Record<string, string>) => {
    setFieldMapping(mapping);
    setIsLoading(true);
    setCurrentStep("processing");
    setError(null);

    try {
      // Create the data to send for import
      const importData = {
        fileName: filePreview?.fileName,
        fileSize: filePreview?.fileSize,
        fieldMapping: mapping,
        fileId: filePreview?.fileId,
      };

      // Send the import request
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(importData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to start import (${response.status})`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error");
      }

      // Notify parent component that import is complete with additional data
      onImportComplete(
        data.importId,
        filePreview?.fileName || "",
        filePreview?.fileSize || 0
      );

      toast({
        title: "Import started",
        description: "Your file is being processed in the background.",
      });

      // Reset to upload state after successful import
      setTimeout(() => {
        handleReset();
      }, 3000);
    } catch (error: any) {
      console.error("Import error:", error);
      setError(error.message || "Failed to start the import process");
      toast({
        title: "Error starting import",
        description: error.message || "Failed to start the import process",
        variant: "destructive",
      });
      // Go back to mapping step on error
      setCurrentStep("mapping");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the process
  const handleReset = () => {
    setCurrentStep("upload");
    setFilePreview(null);
    setFieldMapping({});
    setError(null);
    setUploadProgress(0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Contacts</CardTitle>
        <CardDescription>
          Upload your contacts and map fields to our system
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {currentStep === "upload" && (
          <>
            <FileUpload
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
            />
            {isLoading && uploadProgress > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1" />
              </div>
            )}
          </>
        )}

        {currentStep === "mapping" && filePreview && (
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">File Preview</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filePreview.fileName} (
                    {formatFileSize(filePreview.fileSize)})
                  </p>
                </div>
                <Badge variant="outline">
                  {filePreview.fields.length} columns
                </Badge>
              </div>

              <div className="mt-4 border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {filePreview.fields.map((field) => (
                        <TableHead key={field}>{field}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filePreview.preview.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {filePreview.fields.map((field) => (
                          <TableCell key={`${rowIndex}-${field}`}>
                            {row[field] !== undefined ? String(row[field]) : ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <FieldMapping
              sourceFields={filePreview.fields}
              onMappingComplete={handleMappingComplete}
            />
          </div>
        )}

        {currentStep === "processing" && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h3 className="text-lg font-medium mt-4">Processing Your Import</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              This may take a few minutes depending on file size
            </p>
            {isLoading ? (
              <RefreshCw className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
            ) : (
              <p className="text-sm text-primary">
                Your import has been queued and will be processed in the
                background
              </p>
            )}
          </div>
        )}
      </CardContent>

      {currentStep !== "upload" && currentStep !== "processing" && (
        <CardFooter className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Start Over
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}
