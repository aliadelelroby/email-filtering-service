import { useState, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FileUploadProps = {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  maxSize?: number; // In bytes
  acceptedTypes?: string[];
};

export function FileUpload({
  onFileSelected,
  isLoading,
  maxSize = 5 * 1024 * 1024 * 1024, // 5GB default
  acceptedTypes = [
    ".csv",
    ".xlsx",
    ".xls",
    ".txt",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFile = (file: File) => {
    if (file.size > maxSize) {
      setError(
        `File size too large. Maximum size is ${
          maxSize / (1024 * 1024 * 1024)
        }GB`
      );
      return false;
    }

    const fileType = file.type || "";
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (
      acceptedTypes.length > 0 &&
      !acceptedTypes.includes(fileType) &&
      !acceptedTypes.includes(extension)
    ) {
      setError(
        `Unsupported file type. Supported types: ${acceptedTypes.join(", ")}`
      );
      return false;
    }

    return true;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setError(null);

    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      onFileSelected(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Contact Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/5"
              : error
              ? "border-destructive bg-destructive/5"
              : file
              ? "border-success bg-success/5"
              : "border-gray-300 hover:border-primary hover:bg-primary/5"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <div className="space-y-3">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <div>
                <p className="font-medium text-destructive">Upload Error</p>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">Click or drag and drop to upload</p>
                <p className="text-sm text-muted-foreground">
                  Supports CSV, Excel, and text files (up to{" "}
                  {maxSize / (1024 * 1024 * 1024)}GB)
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {file && (
          <>
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isLoading}
              type="button"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button disabled={!file || isLoading} type="submit">
              {isLoading ? "Uploading..." : "Upload File"}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
