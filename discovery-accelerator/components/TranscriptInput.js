// TranscriptInput.js
'use client';

import { useState } from 'react';
import { readTextFile } from '../lib/fileUtils';

export default function TranscriptInput({ onTranscriptReady }) {
  const [inputMethod, setInputMethod] = useState('upload');
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [error, setError] = useState(null);

  const handleInputMethodChange = (method) => {
    setInputMethod(method);
    
    // Reset file and text inputs when changing method
    setTranscriptFile(null);
    setTranscriptText('');
    setPreviewText('');
    setError(null);
  };

  const handleTranscriptFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setTranscriptFile(file);
    
    try {
      setError(null);
      
      // Read file content if it's a text file
      if (file.type === 'text/plain') {
        const content = await readTextFile(file);
        setTranscriptText(content);
        setPreviewText(content);
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        // For DOCX files, we would need a library like mammoth.js to extract text
        // This is a simplified implementation
        setTranscriptText('DOCX content will be processed on the server');
        setPreviewText('DOCX files will be processed on the server. No preview available.');
      } else {
        setError('Unsupported file type. Please upload a .txt or .docx file.');
        setTranscriptFile(null);
      }
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Failed to read file content. Please try again.');
      setTranscriptFile(null);
    }
  };

  const handleTextareaChange = (e) => {
    const text = e.target.value;
    setTranscriptText(text);
  };

  const handleSubmit = () => {
    // Validate input
    if (inputMethod === 'upload' && !transcriptFile) {
      setError('Please upload a transcript file');
      return;
    }

    if (inputMethod === 'paste' && !transcriptText.trim()) {
      setError('Please enter transcript text');
      return;
    }

    // Send transcript text to parent component
    const finalText = inputMethod === 'upload' ? transcriptText : transcriptText;
    onTranscriptReady(finalText);
  };

  return (
    <div>
      {/* Input method selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transcript Input Method
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-green-500"
              value="upload"
              checked={inputMethod === 'upload'}
              onChange={() => handleInputMethodChange('upload')}
            />
            <span className="ml-2">Upload File</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-green-500"
              value="paste"
              checked={inputMethod === 'paste'}
              onChange={() => handleInputMethodChange('paste')}
            />
            <span className="ml-2">Paste Text</span>
          </label>
        </div>
      </div>

      {/* File upload */}
      {inputMethod === 'upload' && (
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-3">
            <label
              htmlFor="transcript-upload"
              className="cursor-pointer flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>Choose File</span>
              <input
                id="transcript-upload"
                type="file"
                accept=".txt,.docx"
                onChange={handleTranscriptFileChange}
                className="sr-only"
              />
            </label>
            <span className="text-sm text-gray-500">
              {transcriptFile ? transcriptFile.name : 'No file selected'}
            </span>
          </div>
          
          {previewText && (
            <div className="mt-3">
              <div className="font-medium mb-1">Preview:</div>
              <div className="border border-gray-300 rounded-md p-3 bg-gray-50 h-48 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">{previewText}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text input */}
      {inputMethod === 'paste' && (
        <div className="mb-4">
          <label htmlFor="transcript-text" className="block text-sm font-medium text-gray-700 mb-1">
            Paste Transcript Text
          </label>
          <textarea
            id="transcript-text"
            value={transcriptText}
            onChange={handleTextareaChange}
            rows={10}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Paste your transcript here..."
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={handleSubmit}
          disabled={
            (inputMethod === 'upload' && !transcriptFile) || 
            (inputMethod === 'paste' && !transcriptText.trim())
          }
          className={`btn-primary py-2 px-6 ${
            (inputMethod === 'upload' && !transcriptFile) || 
            (inputMethod === 'paste' && !transcriptText.trim())
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          Process Transcript
        </button>
      </div>
    </div>
  );
}