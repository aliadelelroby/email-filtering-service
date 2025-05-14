"use client";

import FileUploader from "@/app/components/FileUploader";
import { Toaster } from "@/components/ui/toaster";

export default function TestUploadPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Large File Upload Test</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <FileUploader />
      </div>
      <Toaster />
    </div>
  );
}
