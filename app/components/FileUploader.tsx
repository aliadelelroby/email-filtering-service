"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface UploadProgressInfo {
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
}

const FileUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressInfo | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5MB chunk size
  const CHUNK_SIZE = 5 * 1024 * 1024;

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset progress
      setProgress(null);
      setIsUploading(true);

      try {
        // For small files (< 50MB), upload directly
        if (file.size < 50 * 1024 * 1024) {
          await uploadSmallFile(file);
        } else {
          // For large files, upload in chunks
          await uploadLargeFile(file);
        }

        toast({
          title: "Upload complete",
          description: "Your file has been uploaded successfully",
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: "There was a problem uploading your file",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [toast]
  );

  const uploadSmallFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Upload failed");
    }

    return response.json();
  };

  const uploadLargeFile = async (file: File) => {
    // Generate unique file ID for this upload
    const fileId = generateUniqueId();

    // Calculate total chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    setProgress({
      totalChunks,
      uploadedChunks: 0,
      progress: 0,
    });

    // Upload chunks in parallel but with a limit
    const MAX_CONCURRENT_CHUNKS = 3;
    let completedChunks = 0;

    // Process chunks in batches
    for (
      let startChunk = 0;
      startChunk < totalChunks;
      startChunk += MAX_CONCURRENT_CHUNKS
    ) {
      const chunkPromises = [];

      // Create a batch of chunk upload promises
      for (
        let i = 0;
        i < MAX_CONCURRENT_CHUNKS && startChunk + i < totalChunks;
        i++
      ) {
        const chunkIndex = startChunk + i;
        chunkPromises.push(uploadChunk(file, chunkIndex, totalChunks, fileId));
      }

      // Wait for all chunks in this batch to complete
      const results = await Promise.all(chunkPromises);

      // Update progress
      completedChunks += results.length;
      setProgress({
        totalChunks,
        uploadedChunks: completedChunks,
        progress: Math.round((completedChunks / totalChunks) * 100),
      });

      // Check if any chunk was completed and the server has finalized the file
      const finalizedResult = results.find(
        (result) => result.finalizing === true
      );
      if (finalizedResult) {
        // Return the finalized result
        return finalizedResult;
      }
    }

    throw new Error("Failed to finalize file upload");
  };

  const uploadChunk = async (
    file: File,
    chunkIndex: number,
    totalChunks: number,
    fileId: string
  ) => {
    // Calculate chunk boundaries
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);

    // Slice the file to get the chunk
    const chunk = file.slice(start, end);

    // Create form data for this chunk
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("fileId", fileId);
    formData.append("fileName", file.name);
    formData.append("fileType", file.type);
    formData.append("totalFileSize", file.size.toString());

    // Upload the chunk
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to upload chunk ${chunkIndex}`
      );
    }

    return response.json();
  };

  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.xlsx,.xls,.txt"
      />

      <Button
        onClick={handleUploadClick}
        disabled={isUploading}
        className="flex items-center gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload File
          </>
        )}
      </Button>

      {progress && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>
              {progress.uploadedChunks} of {progress.totalChunks} chunks
            </span>
            <span>{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="w-full" />
        </div>
      )}
    </div>
  );
};

export default FileUploader;
