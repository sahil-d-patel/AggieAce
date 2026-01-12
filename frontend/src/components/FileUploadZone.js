/**
 * File Upload Zone Component
 *
 * Drag-and-drop file upload area
 *
 * @module components/FileUploadZone
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';

export default function FileUploadZone({ onFileSelect, selectedFile }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelection = (file) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, DOC, or DOCX file');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    onFileSelect(file);
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className={`upload-zone ${isDragging ? 'upload-zone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-tamu-maroon/10 rounded-full">
              <Upload size={48} className="text-tamu-maroon" />
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700">
                Drop your syllabus PDF or DOCX here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse files
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports PDF, DOC, and DOCX - Maximum size: 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-tamu-maroon/5 border-2 border-tamu-maroon rounded-xl p-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-tamu-maroon rounded-lg">
                <FileText size={32} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <button
              onClick={handleRemoveFile}
              className="p-2 hover:bg-red-100 rounded-full transition-colors duration-200"
              title="Remove file"
            >
              <X size={24} className="text-red-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
