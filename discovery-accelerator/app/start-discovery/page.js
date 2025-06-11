// // page.js
// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import ColoredHeader from '../../components/ColoredHeader';
// import StylableContainer from '../../components/StylableContainer';
// import PDFViewer from '../../components/PDFViewer';
// import { processDocuments } from '../../lib/api';
// import { isDocument } from '../../lib/fileUtils';

// export default function StartDiscoveryPage() {
//   const router = useRouter();
//   const [projectName, setProjectName] = useState('');
//   const [sowFile, setSowFile] = useState(null);
//   const [additionalFiles, setAdditionalFiles] = useState([]);
//   const [previewFile, setPreviewFile] = useState(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [processingResult, setProcessingResult] = useState(null);
//   const [error, setError] = useState(null);

//   const handleSowFileChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setSowFile(file);
      
//       // Create object URL for preview if it's a PDF
//       if (file.type === 'application/pdf') {
//         setPreviewFile(URL.createObjectURL(file));
//       } else {
//         setPreviewFile(null);
//       }
//     }
//   };

//   const handleAdditionalFilesChange = (e) => {
//     const files = Array.from(e.target.files);
//     setAdditionalFiles(files);
//   };

//   const handleProcessDocuments = async () => {
//     if (!projectName || !sowFile) {
//       setError('Project name and SOW document are required');
//       return;
//     }

//     try {
//       setError(null);
//       setIsProcessing(true);
      
//       const response = await processDocuments(projectName, sowFile, additionalFiles);
      
//       setProcessingResult(response);
//       setIsProcessing(false);
//     } catch (err) {
//       console.error('Error processing documents:', err);
//       setError('Failed to process documents. Please try again later.');
//       setIsProcessing(false);
//     }
//   };

//   return (
//     <div className="container mx-auto">
//       <ColoredHeader
//         label="Discovery Process"
//         description="Upload SOW document and additional materials to process"
//         colorName="green-70"
//       />

//       <StylableContainer>
//         {/* Project name input */}
//         <div className="mb-4">
//           <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
//             Project Name
//           </label>
//           <input
//             id="project-name"
//             type="text"
//             value={projectName}
//             onChange={(e) => setProjectName(e.target.value)}
//             placeholder="Enter a name for this discovery project"
//             className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
//           />
//         </div>

//         {/* SOW document upload */}
//         <div className="mb-4">
//           <h2 className="text-xl font-semibold mb-2">Statement of Work (SOW)</h2>
//           <div className="flex items-center space-x-3">
//             <label
//               htmlFor="sow-upload"
//               className="cursor-pointer flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
//             >
//               <span>Choose File</span>
//               <input
//                 id="sow-upload"
//                 type="file"
//                 accept=".pdf,.docx"
//                 onChange={handleSowFileChange}
//                 className="sr-only"
//               />
//             </label>
//             <span className="text-sm text-gray-500">
//               {sowFile ? sowFile.name : 'No file selected'}
//             </span>
//           </div>
          
//           {sowFile && sowFile.type === 'application/pdf' && previewFile && (
//             <div className="mt-4">
//               <div className="mb-2 font-medium">Preview SOW Document</div>
//               <PDFViewer filePath={previewFile} />
//             </div>
//           )}
//         </div>

//         {/* Additional documents upload */}
//         <div className="mb-4">
//           <h2 className="text-xl font-semibold mb-2">Additional Documents (Optional)</h2>
//           <div className="flex items-center space-x-3">
//             <label
//               htmlFor="additional-upload"
//               className="cursor-pointer flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
//             >
//               <span>Choose Files</span>
//               <input
//                 id="additional-upload"
//                 type="file"
//                 accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
//                 multiple
//                 onChange={handleAdditionalFilesChange}
//                 className="sr-only"
//               />
//             </label>
//             <span className="text-sm text-gray-500">
//               {additionalFiles.length > 0
//                 ? `${additionalFiles.length} file(s) selected`
//                 : 'No files selected'}
//             </span>
//           </div>
          
//           {additionalFiles.length > 0 && (
//             <div className="mt-3 space-y-2">
//               {additionalFiles.map((file, index) => (
//                 <div key={index} className="flex items-center space-x-2 text-sm">
//                   <span className="text-green-500">✓</span>
//                   <span>{file.name}</span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Process documents button */}
//         <div className="flex justify-center my-6">
//           <button
//             onClick={handleProcessDocuments}
//             disabled={isProcessing || !projectName || !sowFile}
//             className={`btn-primary py-2 px-6 ${
//               isProcessing || !projectName || !sowFile ? 'opacity-50 cursor-not-allowed' : ''
//             }`}
//           >
//             {isProcessing ? 'Processing...' : 'Process Documents'}
//           </button>
//         </div>

//         {error && (
//           <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
//             {error}
//           </div>
//         )}

//         {processingResult && processingResult.status === 'success' && (
//           <div className="mt-4">
//             <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 mb-4">
//               Document processing completed successfully!
//             </div>
            
//             <div className="p-4 border border-gray-200 rounded-md bg-white">
//               <h3 className="font-medium mb-3">Processing Results</h3>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <span className="text-sm text-gray-500">Project ID</span>
//                   <p className="text-lg font-medium">{processingResult.project_id}</p>
//                 </div>
//                 <div>
//                   <span className="text-sm text-gray-500">Project Name</span>
//                   <p className="text-lg font-medium">{processingResult.project_name}</p>
//                 </div>
//               </div>
//             </div>
            
//             <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
//               Proceed to the 'View Questions' tab to view or generate discovery questions.
//             </div>

//             <div className="mt-4 flex justify-center">
//               <button
//                 onClick={() => router.push('/view-questions')}
//                 className="btn-primary py-2 px-6"
//               >
//                 Go to View Questions
//               </button>
//             </div>
//           </div>
//         )}
//       </StylableContainer>
//     </div>
//   );
// }
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Plus, X, Check, Loader2 } from 'lucide-react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import PDFViewer from '../../components/PDFViewer';
import { processDocuments } from '../../lib/api';
import { uploadProjectFiles } from '../../lib/fileUploadUtils';
import { isDocument, formatFileSize } from '../../lib/fileUtils';

export default function StartDiscoveryPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [sowFile, setSowFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleSowFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSowFile(file);
      
      // Create object URL for preview if it's a PDF
      if (file.type === 'application/pdf') {
        setPreviewFile(URL.createObjectURL(file));
      } else {
        setPreviewFile(null);
      }
    }
  };

  const handleAdditionalFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setAdditionalFiles(prev => [...prev, ...files]);
  };

  const handleRemoveAdditionalFile = (index) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e, fileType) => {
    e.preventDefault();
    setDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    if (fileType === 'sow' && files.length > 0) {
      const file = files[0];
      setSowFile(file);
      
      if (file.type === 'application/pdf') {
        setPreviewFile(URL.createObjectURL(file));
      } else {
        setPreviewFile(null);
      }
    } else if (fileType === 'additional') {
      setAdditionalFiles(prev => [...prev, ...files]);
    }
  };

  const handleProcessDocuments = async () => {
    if (!projectName || !sowFile) {
      setError('Project name and SOW document are required');
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);
      
      // Use the file upload utility to handle the upload process
      const result = await uploadProjectFiles(
        projectName,
        sowFile,
        additionalFiles,
        false
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setProcessingResult(result.data);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error processing documents:', err);
      setError(`Failed to process documents: ${err.message || 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto animate-fade-in">
      <ColoredHeader
        label="Start a New Discovery Project"
        description="Upload your Statement of Work and additional materials to begin"
        colorName="green-70"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <StylableContainer className="mb-6">
            {/* Project name input with card-like styling */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">Project Information</h2>
              
              <div className="mb-4">
                <label htmlFor="project-name" className="form-label">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter a name for this discovery project"
                  className="form-control"
                />
                <p className="form-hint">
                  Choose a descriptive name that helps you identify this project
                </p>
              </div>
            </div>

            {/* SOW document upload */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
                Statement of Work (SOW) <span className="text-red-500">*</span>
              </h2>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'sow')}
              >
                <div className="mb-4 flex justify-center">
                  {sowFile ? (
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <FileText size={32} />
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <Upload size={32} />
                    </div>
                  )}
                </div>
                
                {sowFile ? (
                  <div>
                    <p className="text-green-600 font-medium">{sowFile.name}</p>
                    <p className="text-gray-500 text-sm mt-1">{formatFileSize(sowFile.size)}</p>
                    <button 
                      onClick={() => {
                        setSowFile(null);
                        setPreviewFile(null);
                      }}
                      className="mt-3 text-red-500 hover:text-red-700 text-sm font-medium flex items-center mx-auto"
                    >
                      <X size={16} className="mr-1" /> Remove File
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-gray-700 font-medium">Drag & drop your SOW document here</p>
                    <p className="mb-4 text-gray-500 text-sm">or</p>
                    <label
                      htmlFor="sow-upload"
                      className="btn-primary cursor-pointer inline-flex items-center"
                    >
                      <Upload size={16} className="mr-2" />
                      Choose File
                      <input
                        id="sow-upload"
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleSowFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-3 text-xs text-gray-500">Supported formats: PDF, DOCX</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional documents upload */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
                Additional Documents <span className="text-gray-500">(Optional)</span>
              </h2>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'additional')}
              >
                <div className="mb-4">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto">
                    <Plus size={24} />
                  </div>
                </div>
                
                <div>
                  <p className="mb-2 text-gray-700 font-medium">Add supporting documents</p>
                  <p className="mb-4 text-gray-500 text-sm">Drag & drop files here or</p>
                  <label
                    htmlFor="additional-upload"
                    className="btn-outline cursor-pointer inline-flex items-center"
                  >
                    <Upload size={16} className="mr-2" />
                    Browse Files
                    <input
                      id="additional-upload"
                      type="file"
                      accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleAdditionalFilesChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-3 text-xs text-gray-500">
                    Supported formats: PDF, DOCX, PPTX, JPG, PNG
                  </p>
                </div>
              </div>
              
              {/* List of additional files */}
              {additionalFiles.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">
                      Additional Files ({additionalFiles.length})
                    </h3>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {additionalFiles.map((file, index) => (
                      <li key={index} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mr-3">
                            <FileText size={16} />
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-gray-700">{file.name}</p>
                            <p className="text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAdditionalFile(index)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Remove file"
                        >
                          <X size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Process documents button */}
            <div className="flex justify-end mt-8">
              <button
                onClick={handleProcessDocuments}
                disabled={isProcessing || !projectName || !sowFile}
                className={`btn-primary py-2 px-6 flex items-center ${
                  isProcessing || !projectName || !sowFile ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Discovery
                  </>
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}
          </StylableContainer>
        </div>
        
        {/* Right sidebar / Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <StylableContainer>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">Document Preview</h2>
              
              {sowFile && sowFile.type === 'application/pdf' && previewFile ? (
                <div>
                  <PDFViewer filePath={previewFile} />
                </div>
              ) : sowFile ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-700 font-medium">{sowFile.name}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Preview not available for {sowFile.name.split('.').pop().toUpperCase()} files
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500">
                    Upload a PDF file to see a preview here
                  </p>
                </div>
              )}
              
              {/* Help section */}
              <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-medium text-blue-700 mb-2">Tips</h3>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    Upload your SOW to automatically extract key project information
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    Add supporting documents like proposals or requirements docs
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    The system will generate discovery questions based on document analysis
                  </li>
                </ul>
              </div>
            </StylableContainer>
          </div>
        </div>
      </div>

      {/* Processing result */}
      {processingResult && processingResult.status === 'success' && (
        <div className="mt-8 animate-fade-in">
          <StylableContainer>
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 mb-6 flex items-center">
              <Check size={20} className="mr-2" />
              <span className="font-medium">Document processing completed successfully!</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Project ID</p>
                    <p className="text-lg font-semibold">{processingResult.project_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Project Name</p>
                    <p className="text-lg font-semibold">{processingResult.project_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Next Steps</h3>
                <p className="text-gray-600 mb-4">
                  Your documents have been processed and analyzed. The system has generated discovery questions based on the SOW content.
                </p>
                <p className="text-gray-600">
                  Proceed to the 'View Questions' page to review and customize the generated questions.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/view-questions')}
                className="btn-primary py-3 px-8"
              >
                View Generated Questions
              </button>
              <button
                onClick={() => {
                  // Reset the form for new project
                  setProjectName('');
                  setSowFile(null);
                  setAdditionalFiles([]);
                  setPreviewFile(null);
                  setProcessingResult(null);
                }}
                className="btn-secondary py-3 px-8"
              >
                Start New Project
              </button>
            </div>
          </StylableContainer>
        </div>
      )}
    </div>
  );
}