/**
 * Home Page Component
 *
 * Main page with file upload and conversion functionality
 *
 * @module app/page
 */

'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import FileUploadZone from '@/components/FileUploadZone';
import MetadataForm from '@/components/MetadataForm';
import ConversionStatus from '@/components/ConversionStatus';
import { convertSyllabus } from '@/lib/api';
import { getAccessToken } from '@/lib/storage';
import { BookOpen, Calendar, Cloud } from 'lucide-react';

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    className: '',
    sectionNumber: '',
    semesterStart: '',
    semesterEnd: '',
    timezone: 'America/Chicago',
  });
  const [conversionStatus, setConversionStatus] = useState('idle'); // idle, converting, success, error
  const [conversionResult, setConversionResult] = useState(null);
  const [conversionError, setConversionError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [queueInfo, setQueueInfo] = useState(null);

  const handleConvert = async () => {
    // Validate form
    if (!selectedFile) {
      alert('Please select a PDF file');
      return;
    }

    if (!formData.className || !formData.sectionNumber || !formData.semesterStart || !formData.semesterEnd) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(formData.semesterStart) || !dateRegex.test(formData.semesterEnd)) {
      alert('Please enter dates in MM/DD/YYYY format');
      return;
    }

    try {
      setConversionStatus('converting');
      setConversionError(null);
      setUploadProgress(0);
      setQueueInfo(null);

      // Get Google access token if available
      const accessToken = getAccessToken();

      const result = await convertSyllabus({
        file: selectedFile,
        className: formData.className,
        sectionNumber: formData.sectionNumber,
        semesterStart: formData.semesterStart,
        semesterEnd: formData.semesterEnd,
        timezone: formData.timezone,
        googleAccessToken: accessToken,
        onUploadProgress: setUploadProgress,
        onQueueUpdate: setQueueInfo,
      });

      setConversionResult(result);
      setConversionStatus('success');
    } catch (error) {
      console.error('Conversion error:', error);
      setConversionError(error);
      setConversionStatus('error');
    }
  };

  const isFormValid = selectedFile &&
    formData.className &&
    formData.sectionNumber &&
    formData.semesterStart &&
    formData.semesterEnd;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-tamu-maroon mb-4">
            Transform Your Syllabus Into a Calendar
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your course syllabus PDF and instantly convert it to an iCalendar file.
            Automatically sync with your favorite calendar app.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-tamu-maroon/10 rounded-full">
                <BookOpen size={32} className="text-tamu-maroon" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Easy Upload</h3>
            <p className="text-sm text-gray-600">
              Simply drag and drop your syllabus PDF or browse to select it
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-tamu-maroon/10 rounded-full">
                <Calendar size={32} className="text-tamu-maroon" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Instant Conversion</h3>
            <p className="text-sm text-gray-600">
              Get your calendar file in seconds, ready to import anywhere
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-tamu-maroon/10 rounded-full">
                <Cloud size={32} className="text-tamu-maroon" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Google Drive Sync</h3>
            <p className="text-sm text-gray-600">
              Sign in to automatically save files to your Google Drive
            </p>
          </div>
        </div>

        {/* Conversion Form */}
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Convert Your Syllabus</h2>

            {/* File Upload */}
            <div className="mb-8">
              <FileUploadZone
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
              />
            </div>

            {/* Metadata Form */}
            {selectedFile && (
              <div className="animate-fadeIn">
                <MetadataForm
                  formData={formData}
                  onChange={setFormData}
                  disabled={conversionStatus === 'converting'}
                />

                {/* Convert Button */}
                <div className="mt-8">
                  <button
                    onClick={handleConvert}
                    disabled={!isFormValid || conversionStatus === 'converting'}
                    className="w-full btn-primary text-lg py-4"
                  >
                    {conversionStatus === 'converting'
                      ? 'Converting...'
                      : 'Convert to Calendar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Conversion Status */}
          <ConversionStatus
            status={conversionStatus}
            result={conversionResult}
            error={conversionError}
            progress={uploadProgress}
            queueInfo={queueInfo}
          />
        </div>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="card bg-tamu-gray/50">
            <h3 className="text-xl font-bold text-gray-800 mb-4">How to Use</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Upload your course syllabus PDF file</li>
              <li>Enter your course information (class name, section, semester dates)</li>
              <li>Click "Convert to Calendar" to generate your .ics file</li>
              <li>Download the calendar file and import it to your calendar app</li>
              <li>(Optional) Sign in with Google to automatically save to Drive</li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-tamu-maroon text-white mt-20 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            AggieAce
          </p>
          <p className="text-xs text-tamu-white/70 mt-2">
            Syllabus Amplified, Life Simplified
          </p>
        </div>
      </footer>
    </div>
  );
}
