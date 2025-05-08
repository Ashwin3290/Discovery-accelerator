// page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import ProjectSelector from '../../components/ProjectSelector';
import MetricCard from '../../components/MetricCard';
import ProgressChart from '../../components/ProgressChart';
import { processTranscript } from '../../lib/api';
import { readTextFile } from '../../lib/fileUtils';

export default function ProcessTranscriptsPage() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [inputMethod, setInputMethod] = useState('upload');
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState(null);
  const [error, setError] = useState(null);

  const handleProjectSelect = (projectName, projectId) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
  };

  const handleInputMethodChange = (method) => {
    setInputMethod(method);
    
    // Reset file and text inputs when changing method
    setTranscriptFile(null);
    setTranscriptText('');
  };

  const handleTranscriptFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setTranscriptFile(file);
      
      try {
        // Read file content if it's a text file
        if (file.type === 'text/plain') {
          const content = await readTextFile(file);
          setTranscriptText(content);
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          // For DOCX files, we would need a library like mammoth.js to extract text
          // This is a simplified implementation
          setTranscriptText('DOCX content will be processed on the server');
        }
      } catch (err) {
        console.error('Error reading file:', err);
        setError('Failed to read file content');
      }
    }
  };

  const handleProcessTranscript = async () => {
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }

    if (inputMethod === 'upload' && !transcriptFile) {
      setError('Please upload a transcript file');
      return;
    }

    if (inputMethod === 'paste' && !transcriptText.trim()) {
      setError('Please enter transcript text');
      return;
    }

    const text = inputMethod === 'upload' ? transcriptText : transcriptText;
    
    if (!text || !text.trim()) {
      setError('Transcript content is empty');
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);
      
      const response = await processTranscript(selectedProjectId, text);
      
      if (response.status === 'error') {
        throw new Error(response.message || 'Failed to process transcript');
      }
      
      setProcessingResult(response);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error processing transcript:', err);
      setError(`Failed to process transcript: ${err.message || 'Please try again later'}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Process Meeting Transcripts"
        description="Upload meeting transcripts to extract answers and generate follow-up questions"
        colorName="green-70"
      />

      <StylableContainer>
        {/* Project selector */}
        <ProjectSelector onSelectProject={handleProjectSelect} />

        {selectedProject && (
          <>
            {/* Transcript input method selection */}
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

            {/* File upload or text input */}
            {inputMethod === 'upload' ? (
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
                
                {transcriptFile && transcriptText && (
                  <div className="mt-3">
                    <div className="font-medium mb-1">Preview:</div>
                    <div className="border border-gray-300 rounded-md p-3 bg-gray-50 h-48 overflow-auto">
                      <pre className="text-sm whitespace-pre-wrap">{transcriptText}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <label htmlFor="transcript-text" className="block text-sm font-medium text-gray-700 mb-1">
                  Paste Transcript Text
                </label>
                <textarea
                  id="transcript-text"
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  rows={10}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Paste your transcript here..."
                />
              </div>
            )}

            {/* Process transcript button */}
            <div className="flex justify-center my-6">
              <button
                onClick={handleProcessTranscript}
                disabled={isProcessing || !selectedProjectId || (inputMethod === 'upload' && !transcriptFile) || (inputMethod === 'paste' && !transcriptText.trim())}
                className={`btn-primary py-2 px-6 ${
                  isProcessing || !selectedProjectId || (inputMethod === 'upload' && !transcriptFile) || (inputMethod === 'paste' && !transcriptText.trim())
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {isProcessing ? 'Processing...' : 'Process Transcript'}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {processingResult && processingResult.status === 'success' && (
              <div className="mt-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 mb-4">
                  Transcript processed successfully. Found {processingResult.answers_found || 0} answers.
                </div>
                
                {/* Display follow-up questions */}
                {processingResult.followup_questions && processingResult.followup_questions.length > 0 && (
                  <div className="mb-6">
                    <ColoredHeader label="Follow-up Questions Generated" colorName="green-50" />
                    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Question
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Context
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Priority
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {processingResult.followup_questions.map((question, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {question.question}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {question.context || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {question.priority || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Display discovery status */}
                {processingResult.discovery_status && (
                  <div className="mb-6">
                    <ColoredHeader label="Current Discovery Status" colorName="green-50" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-4">
                        <MetricCard 
                          label="Total Questions" 
                          value={processingResult.discovery_status.total_questions || 0}
                        />
                        <MetricCard 
                          label="Unanswered Questions" 
                          value={processingResult.discovery_status.question_status?.unanswered || 0}
                        />
                      </div>
                      <div className="space-y-4">
                        <MetricCard 
                          label="Transcripts Processed" 
                          value={processingResult.discovery_status.transcript_count || 0}
                        />
                        <MetricCard 
                          label="Completion Status" 
                          value={processingResult.discovery_status.discovery_complete ? 'Complete' : 'In Progress'}
                        />
                      </div>
                    </div>
                    
                    {/* Progress chart */}
                    <ProgressChart projectStatus={processingResult.discovery_status} />
                  </div>
                )}
                
                {/* Navigation options */}
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                  <button
                    onClick={() => router.push('/view-questions')}
                    className="btn-primary py-2 px-6"
                  >
                    Go to View Questions
                  </button>
                  <button
                    onClick={() => router.push('/discovery-status')}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition-all duration-300"
                  >
                    Go to Discovery Status
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </StylableContainer>
    </div>
  );
}