'use client';

import { useState, useRef } from 'react';
import { formatFileSize } from '../lib/fileUtils';

export default function FileUpload({ 
  id, 
  label, 
  acceptedFileTypes = '', 
  multiple = false, 
  onChange,
  buttonText = 'Choose File' 
}) {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = multiple ? Array.from(e.target.files) : e.target.files[0] ? [e.target.files[0]] : [];
    
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      onChange(multiple ? selectedFiles : selectedFiles[0]);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);
    onChange(multiple ? updatedFiles : updatedFiles[0] || null);
    
    // Reset the file input
    if (fileInputRef.current && updatedFiles.length === 0) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-3 mb-3">
        <label
          htmlFor={id}
          className="cursor-pointer flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>{buttonText}</span>
          <input
            id={id}
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            multiple={multiple}
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
        <span className="text-sm text-gray-500">
          {files.length > 0
            ? multiple 
              ? `${files.length} file(s) selected`
              : files[0].name
            : 'No file selected'}
        </span>
      </div>
      
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-md p-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="truncate max-w-xs">{file.name}</span>
                <span className="text-gray-500 text-xs">({formatFileSize(file.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}