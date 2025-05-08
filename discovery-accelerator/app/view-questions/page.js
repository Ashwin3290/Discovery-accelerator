'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import ProjectSelector from '../../components/ProjectSelector';
import { fetchQuestions, generateQuestions } from '../../lib/api';

export default function ViewQuestionsPage() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingResult, setGeneratingResult] = useState(null);

  const handleProjectSelect = (projectName, projectId) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
    setSelectedQuestionId(null);
    setSelectedQuestion(null);
  };

  // Load questions when project or filter changes
  useEffect(() => {
    const loadQuestions = async () => {
      if (!selectedProjectId) return;

      try {
        setLoading(true);
        setError(null);
        
        const status = statusFilter !== 'All' ? statusFilter.toLowerCase().replace(' ', '_') : null;
        const response = await fetchQuestions(selectedProjectId, status);
        
        if (response && response.status === 'success') {
          setQuestions(response.questions || []);
          
          // Reset selected question if it's no longer in the filtered list
          if (selectedQuestionId) {
            const stillExists = response.questions.some(q => q.id === selectedQuestionId);
            if (!stillExists) {
              setSelectedQuestionId(null);
              setSelectedQuestion(null);
            }
          }
        } else {
          setError('Failed to load questions');
        }
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load questions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [selectedProjectId, statusFilter]);

  // Update selected question when ID changes
  useEffect(() => {
    if (selectedQuestionId && questions.length > 0) {
      const question = questions.find(q => q.id === selectedQuestionId);
      setSelectedQuestion(question || null);
    } else {
      setSelectedQuestion(null);
    }
  }, [selectedQuestionId, questions]);

  const handleGenerateQuestions = async () => {
    if (!selectedProjectId) return;

    try {
      setIsGenerating(true);
      setGeneratingResult(null);
      setError(null);
      
      const response = await generateQuestions(selectedProjectId);
      
      if (response.status === 'error') {
        throw new Error(response.message || 'Failed to generate questions');
      }
      
      setGeneratingResult(response);
      
      // Reload questions after generating
      const updatedResponse = await fetchQuestions(selectedProjectId, null);
      if (updatedResponse && updatedResponse.status === 'success') {
        setQuestions(updatedResponse.questions || []);
      }
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(`Failed to generate questions: ${err.message || 'Please try again later'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Format status display with appropriate styling
  const formatStatusDisplay = (status) => {
    if (status === 'unanswered') {
      return <span className="status-unanswered">⚠️ Unanswered</span>;
    } else if (status === 'partially_answered') {
      return <span className="status-partially">⚠️ Partially Answered</span>;
    } else if (status === 'answered') {
      return <span className="status-answered">✅ Answered</span>;
    }
    return status;
  };

  // Export questions to CSV
  const exportToCSV = () => {
    if (!questions.length) return;

    // Prepare CSV content
    const headers = ['ID', 'Question', 'Status', 'Priority', 'Source', 'Answer'];
    
    const csvRows = [
      headers.join(','),
      ...questions.map(q => {
        const answer = q.answer ? q.answer.answer_text : '';
        return [
          q.id,
          `"${q.question.replace(/"/g, '""')}"`,
          q.status,
          q.priority,
          `"${(q.source || '').replace(/"/g, '""')}"`,
          `"${(answer || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedProject}_questions.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="View and Manage Questions"
        description="View current questions, their status, and answers"
        colorName="green-70"
      />

      <StylableContainer>
        {/* Project selector */}
        <ProjectSelector onSelectProject={handleProjectSelect} />

        {selectedProject && (
          <>
            {/* Filter options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <div className="flex space-x-6">
                {[
                  { value: 'All', icon: '❓' },
                  { value: 'Unanswered', icon: '🔴' },
                  { value: 'Partially Answered', icon: '🟠' },
                  { value: 'Answered', icon: '🟢' }
                ].map(option => (
                  <label key={option.value} className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-green-500"
                      value={option.value}
                      checked={statusFilter === option.value}
                      onChange={() => setStatusFilter(option.value)}
                    />
                    <span className="ml-2">{option.icon} {option.value}</span>
                  </label>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-2 text-gray-500">Loading questions...</p>
              </div>
            ) : error ? (
              <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            ) : questions.length === 0 && statusFilter === 'All' ? (
              <div className="text-center py-8">
                <p className="text-amber-600 mb-8">No questions found for this project.</p>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating}
                  className={`btn-primary py-2 px-6 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGenerating ? 'Generating...' : 'Generate Questions for This Project'}
                </button>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-blue-600">No questions found with the selected filter.</p>
                <button
                  onClick={() => setStatusFilter('All')}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-all duration-300"
                >
                  Show All Questions
                </button>
              </div>
            ) : (
              <div>
                {/* Questions table */}
                <div className="mb-4 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Question
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {questions.map((question) => (
                        <tr 
                          key={question.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedQuestionId === question.id ? 'bg-green-50' : ''
                          }`}
                          onClick={() => setSelectedQuestionId(question.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {question.id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                            {question.question}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {formatStatusDisplay(question.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {question.priority || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                            {question.source || 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Export button */}
                <div className="flex justify-end mb-6">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded border border-gray-300 transition-colors duration-200"
                  >
                    <span>📥</span>
                    <span>Download Questions as CSV</span>
                  </button>
                </div>

                {/* Question details */}
                {selectedQuestion && (
                  <div className="mt-8">
                    <ColoredHeader label="Question Details" colorName="green-50" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-4">
                          Question Information
                        </h3>
                        <p className="text-gray-700 mb-6">{selectedQuestion.question}</p>
                        
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Context:</h4>
                            <p className="mt-1">{selectedQuestion.context || 'No context provided'}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Source:</h4>
                            <p className="mt-1">{selectedQuestion.source || 'Unknown source'}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Priority:</h4>
                            <p className="mt-1">{selectedQuestion.priority || 'N/A'} (1 highest, 3 lowest)</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                          <h3 className="text-lg font-semibold">Answer Status</h3>
                          {(() => {
                            const status = selectedQuestion.status || 'unknown';
                            let statusColor, statusIcon, statusLabel;
                            
                            if (status === 'unanswered') {
                              statusColor = 'text-red-500';
                              statusIcon = '⚠️';
                              statusLabel = 'Unanswered';
                            } else if (status === 'partially_answered') {
                              statusColor = 'text-orange-500';
                              statusIcon = '⚠️';
                              statusLabel = 'Partially Answered';
                            } else {
                              statusColor = 'text-green-500';
                              statusIcon = '✅';
                              statusLabel = 'Answered';
                            }
                            
                            return (
                              <span className={`font-medium ${statusColor}`}>
                                {statusIcon} {statusLabel}
                              </span>
                            );
                          })()}
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Answer:</h4>
                          {selectedQuestion.answer ? (
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                              <p className="mb-4">{selectedQuestion.answer.answer_text || 'No answer text'}</p>
                              <div className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-500">
                                <p><span className="font-medium">Confidence:</span> {selectedQuestion.answer.confidence || 'N/A'}</p>
                                <p><span className="font-medium">Date:</span> {selectedQuestion.answer.meeting_date || 'Unknown'}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-blue-700">
                              No answer available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {generatingResult && generatingResult.status === 'success' && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-700 font-medium">
                  Question generation completed successfully! Generated {generatingResult.initial_questions_count || 0} questions.
                </p>
              </div>
            )}
          </>
        )}
      </StylableContainer>
    </div>
  );
}