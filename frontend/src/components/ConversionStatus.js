/**
 * Conversion Status Component
 *
 * Shows conversion progress and result
 *
 * @module components/ConversionStatus
 */

'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Download, ExternalLink, Cloud } from 'lucide-react';
import { downloadFile, saveToGoogleDrive } from '@/lib/api';
import { getAccessToken } from '@/lib/storage';

export default function ConversionStatus({ status, result, error, progress, queueInfo }) {
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [folderName, setFolderName] = useState('AggieAce');
  const [isSaving, setIsSaving] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState(null);
  const [driveError, setDriveError] = useState(null);

  // Reset Drive state when a new conversion starts
  useEffect(() => {
    if (status === 'converting') {
      setDriveSuccess(null);
      setDriveError(null);
      setShowDriveModal(false);
      setFolderName('AggieAce');
    }
  }, [status]);

  const accessToken = getAccessToken();
  const isSignedIn = Boolean(accessToken);

  const handleDownload = () => {
    if (result?.data?.conversion) {
      const { fileName, downloadUrl } = result.data.conversion;
      downloadFile(downloadUrl, fileName);
    }
  };

  const handleSaveToDrive = async () => {
    if (!accessToken) {
      alert('Please sign in with Google first');
      return;
    }

    setIsSaving(true);
    setDriveError(null);

    try {
      const saveResult = await saveToGoogleDrive({
        googleAccessToken: accessToken,
        pdfPath: result.data.conversion.pdfPath,
        icsPath: result.data.conversion.outputPath,
        folderName: folderName.trim() || 'AggieAce',
        metadata: result.data.conversion.metadata
      });

      setDriveSuccess(saveResult.data);
      setTimeout(() => {
        setShowDriveModal(false);
      }, 3000);
    } catch (err) {
      setDriveError(err.message || 'Failed to save to Google Drive');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'idle') {
    return null;
  }

  // Determine processing stage based on progress and queue info
  const getProcessingStage = () => {
    if (progress < 100) {
      return {
        title: 'Uploading your file...',
        description: 'Preparing your syllabus for processing',
        showProgress: true,
        showQueue: false,
      };
    } else if (queueInfo && queueInfo.status === 'queued' && queueInfo.data?.position > 0) {
      const position = queueInfo.data.position;
      return {
        title: `In queue (${position} ${position === 1 ? 'job' : 'jobs'} ahead)`,
        description: 'Your syllabus will be processed shortly. Please wait...',
        showProgress: false,
        showQueue: true,
        queuePosition: position,
      };
    } else if (queueInfo && queueInfo.status === 'processing') {
      return {
        title: 'Processing with AI...',
        description: 'Analyzing syllabus and generating calendar (this may take 30-60 seconds)',
        showProgress: false,
        showQueue: false,
      };
    } else {
      return {
        title: 'Processing with AI...',
        description: 'Analyzing syllabus and generating calendar (this may take 30-60 seconds)',
        showProgress: false,
        showQueue: false,
      };
    }
  };

  const stage = getProcessingStage();

  return (
    <div className="mt-8 animate-fadeIn">
      {/* Converting */}
      {status === 'converting' && (
        <div className="card">
          <div className="flex items-center space-x-4">
            <Loader2 size={32} className="text-tamu-maroon animate-spin" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">
                {stage.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stage.description}
              </p>
              {stage.showProgress && progress > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-tamu-maroon h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload progress: {progress}%</p>
                </div>
              )}
              {!stage.showProgress && stage.showQueue && (
                <div className="mt-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-1">
                      {[...Array(Math.min(stage.queuePosition + 1, 5))].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold ${
                            i === stage.queuePosition ? 'bg-tamu-maroon text-white' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">Your position in queue</span>
                  </div>
                </div>
              )}
              {!stage.showProgress && !stage.showQueue && (
                <div className="mt-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="flex space-x-1">
                      <span className="inline-block w-2 h-2 bg-tamu-maroon rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                      <span className="inline-block w-2 h-2 bg-tamu-maroon rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
                      <span className="inline-block w-2 h-2 bg-tamu-maroon rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
                    </div>
                    <span>AI is analyzing your syllabus...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-start space-x-4">
            <CheckCircle size={32} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800">
                Conversion successful!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your calendar file is ready to download.
              </p>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-3">
                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Download size={20} />
                  <span>Download Calendar File</span>
                </button>

                {/* Save to Drive Button - Only show if signed in */}
                {isSignedIn && !driveSuccess && (
                  <button
                    onClick={() => setShowDriveModal(true)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Cloud size={20} />
                    <span>Save to Google Drive</span>
                  </button>
                )}
              </div>

              {/* Drive Success Message */}
              {driveSuccess && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fadeIn">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    ☁️ Files saved to Google Drive!
                  </p>
                  <div className="space-y-2">
                    <a
                      href={driveSuccess.pdf.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={16} />
                      <span>View Syllabus PDF</span>
                    </a>
                    <a
                      href={driveSuccess.calendar.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={16} />
                      <span>View Calendar File</span>
                    </a>
                    <a
                      href={driveSuccess.folderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={16} />
                      <span>Open Folder in Drive</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start space-x-4">
            <AlertCircle size={32} className="text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Conversion failed
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error.message || 'An error occurred during conversion. Please try again.'}
              </p>
              {error.errors && error.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                  {error.errors.map((err, index) => (
                    <li key={index}>{err.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Save to Google Drive
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="AggieAce"
                  className="input-field"
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Files will be saved in this folder in your Google Drive
                </p>
              </div>

              {driveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {driveError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDriveModal(false);
                    setDriveError(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToDrive}
                  disabled={isSaving}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Cloud size={18} />
                      <span>Save to Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
