'use client';

import { useState } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Plus,
  Download,
  Eye
} from 'lucide-react';
import { uploadAdditionalDocuments, bulkProcessAdditionalDocuments } from '../lib/api';
import { formatFileSize } from '../lib/fileUtils';

export default function AdditionalDocumentUpload({ 
  projectId, 
  projectName, 
  onProcessingComplete,
  onClose 
}) {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [useBulkProcessing, setUseBulkProcessing] = useState(false);

  // Handle file selection
  const handleFileSelect = (event) => {
    console.log('=== FILE SELECT DEBUG START ===');
    console.log('Event target:', event.target);
    console.log('Event target files:', event.target.files);
    console.log('Number of files selected:', event.target.files.length);
    
    const selectedFiles = Array.from(event.target.files);
    console.log('Selected files array:', selectedFiles);
    
    selectedFiles.forEach((file, index) => {
      console.log(`File ${index}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        instanceof_File: file instanceof File
      });
    });
    
    const newFiles = selectedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'ready'
    }));
    
    console.log('New files with metadata:', newFiles);
    console.log('=== FILE SELECT DEBUG END ===');
    
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  };

  // Remove file from list
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setResults(null);
    setProcessed(false);
    setError(null);
  };

  // Process documents
  const processDocuments = async () => {
    if (files.length === 0) {
      setError('Please select at least one document to process.');
      return;
    }

    console.log('=== PROCESS DOCUMENTS DEBUG START ===');
    console.log('Current files state:', files);
    console.log('Number of files to process:', files.length);

    setProcessing(true);
    setError(null);

    try {
      const fileObjects = files.map(f => f.file);
      console.log('Extracted file objects:', fileObjects);
      
      // Validate each file object
      fileObjects.forEach((file, index) => {
        console.log(`File object ${index}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          instanceof_File: file instanceof File,
          constructor_name: file.constructor.name
        });
        
        if (file.size === 0) {
          console.warn(`WARNING: File ${index} (${file.name}) has size 0!`);
        }
      });

      let response;

      if (useBulkProcessing && files.length > 3) {
        console.log('Using bulk processing...');
        response = await bulkProcessAdditionalDocuments(projectId, fileObjects);
      } else {
        console.log('Using regular processing...');
        response = await uploadAdditionalDocuments(projectId, fileObjects);
      }

      console.log('API response:', response);
      console.log('=== PROCESS DOCUMENTS DEBUG END ===');

      if (response.status === 'success') {
        setResults(response);
        setProcessed(true);
        
        // Update file statuses
        setFiles(prev => prev.map(f => ({
          ...f,
          status: 'processed'
        })));

        // Notify parent component
        if (onProcessingComplete) {
          onProcessingComplete(response);
        }
      } else {
        setError(response.message || 'Failed to process documents');
      }
    } catch (err) {
      console.error('Error processing documents:', err);
      console.log('=== PROCESS DOCUMENTS DEBUG END (ERROR) ===');
      setError(err.message || 'An error occurred while processing documents');
    } finally {
      setProcessing(false);
    }
  };

  // Quick test function
  const testFileUpload = () => {
    const testContent = "This is a test file content";
    const testFile = new File([testContent], "test.txt", { type: "text/plain" });
    
    console.log('Test file created:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type,
      instanceof_File: testFile instanceof File
    });
    
    const testFileInfo = {
      file: testFile,
      id: 'test-file',
      name: testFile.name,
      size: testFile.size,
      type: testFile.type,
      status: 'ready'
    };
    
    setFiles([testFileInfo]);
    console.log('Test file added to state');
  };

  // Get file type icon
  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
    return '📄';
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Ready
          </span>
        );
      case 'processed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Processed
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle size={12} className="mr-1" />
            Error
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Add Additional Documents
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Project: <span className="font-medium">{projectName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            disabled={processing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {!processed && (
            <>
              {/* File Upload Area */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Additional Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Drag and drop files here, or click to select
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    Supports PDF, DOCX, XLSX, PPTX files
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="additional-docs-input"
                    disabled={processing}
                  />
                  <label
                    htmlFor="additional-docs-input"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={16} className="mr-2" />
                    Select Files
                  </label>
                </div>
              </div>

              {/* Processing Options */}
              {files.length > 3 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="bulk-processing"
                      checked={useBulkProcessing}
                      onChange={(e) => setUseBulkProcessing(e.target.checked)}
                      className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                    />
                    <label htmlFor="bulk-processing" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Use bulk processing (recommended for {files.length}+ documents)
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Bulk processing processes documents in optimized batches to avoid rate limits and improve performance.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Selected Documents ({files.length})
                </h3>
                {!processed && !processing && (
                  <button
                    onClick={clearFiles}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((fileInfo) => (
                  <div
                    key={fileInfo.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-2xl">{getFileIcon(fileInfo.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {fileInfo.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(fileInfo.size)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(fileInfo.status)}
                      {!processed && !processing && (
                        <button
                          onClick={() => removeFile(fileInfo.id)}
                          className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Results */}
          {processed && results && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Processing Results
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Documents Processed
                      </p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {results.documents_processed || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Eye size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Answers Found
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {results.answers_found || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Plus size={20} className="text-purple-600 dark:text-purple-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        New Questions
                      </p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {results.new_questions_generated || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discovery Status Update */}
              {results.discovery_status && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Updated Discovery Status
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Total Questions</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {results.discovery_status.total_questions}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Answered</p>
                      <p className="font-medium text-green-600 dark:text-green-400">
                        {results.discovery_status.question_status?.answered || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Partially Answered</p>
                      <p className="font-medium text-yellow-600 dark:text-yellow-400">
                        {results.discovery_status.question_status?.partially_answered || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Discovery Complete</p>
                      <p className={`font-medium ${results.discovery_status.discovery_complete ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {results.discovery_status.discovery_complete ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error Processing Documents
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {processed 
              ? 'Documents have been processed successfully.' 
              : files.length > 0 
                ? `${files.length} document${files.length !== 1 ? 's' : ''} selected` 
                : 'No documents selected'
            }
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
              disabled={processing}
            >
              {processed ? 'Close' : 'Cancel'}
            </button>
            
            {!processed && (
              <button
                onClick={processDocuments}
                disabled={files.length === 0 || processing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Process Documents
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}