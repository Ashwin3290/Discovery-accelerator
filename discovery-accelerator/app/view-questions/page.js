'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Search, Filter, RefreshCw, FileText, X } from 'lucide-react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import ProjectSelector from '../../components/ProjectSelector';
import { fetchQuestions, generateQuestions, fetchProjects } from '../../lib/api';

export default function ViewQuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId');
  
  // Ref for auto-scrolling to question details
  const questionDetailsRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ? parseInt(initialProjectId) : null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingResult, setGeneratingResult] = useState(null);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setProjectsLoading(true);
        const response = await fetchProjects();
        if (response && response.status === 'success') {
          const enhancedProjects = response.projects.map((project, index) => {
            let id = index + 1;
            const idMatch = project.match(/[^a-zA-Z0-9](\d+)$/);
            if (idMatch) {
              id = parseInt(idMatch[1]);
            }
            return { id: id, name: project };
          });
          setProjects(enhancedProjects);

          // Set initial project if provided in URL
          if (initialProjectId) {
            const project = enhancedProjects.find(p => p.id === parseInt(initialProjectId));
            if (project) {
              setSelectedProject(project.name);
            }
          }
        }
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setProjectsLoading(false);
      }
    };
    loadProjects();
  }, [initialProjectId]);

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project?.name);
    setSelectedProjectId(projectId);
    setSelectedQuestionId(null);
    setSelectedQuestion(null);

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('projectId', projectId.toString());
    window.history.pushState({}, '', url);
  };

  // Load questions when project or filter changes
  useEffect(() => {
    const loadQuestions = async () => {
      if (!selectedProjectId) {
        setQuestions([]);
        setFilteredQuestions([]);
        return;
      }

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
          setQuestions([]);
        }
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load questions. Please try again later.');
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [selectedProjectId, statusFilter]);

  // Filter questions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredQuestions(questions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = questions.filter(question => 
        question.question.toLowerCase().includes(query) ||
        (question.source && question.source.toLowerCase().includes(query)) ||
        (question.context && question.context.toLowerCase().includes(query))
      );
      setFilteredQuestions(filtered);
    }
  }, [questions, searchQuery]);

  // Update selected question when ID changes
  useEffect(() => {
    if (selectedQuestionId && filteredQuestions.length > 0) {
      const question = filteredQuestions.find(q => q.id === selectedQuestionId);
      setSelectedQuestion(question || null);
    } else {
      setSelectedQuestion(null);
    }
  }, [selectedQuestionId, filteredQuestions]);

  // Auto-scroll to question details when a question is selected
  useEffect(() => {
    if (selectedQuestion && questionDetailsRef.current) {
      // Small delay to ensure the component has rendered
      setTimeout(() => {
        questionDetailsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [selectedQuestion]);

  const handleQuestionClick = (questionId) => {
    setSelectedQuestionId(questionId);
  };

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
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">⚠️ Unanswered</span>;
    } else if (status === 'partially_answered') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⚠️ Partially Answered</span>;
    } else if (status === 'partially_answered') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⚠️ Partially Answered</span>;
    } else if (status === 'answered') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✅ Answered</span>;
    }
    return status;
  };

  // Export questions to CSV
  const exportToCSV = () => {
    if (!filteredQuestions.length) return;

    // Prepare CSV content
    const headers = ['ID', 'Question', 'Status', 'Priority', 'Source', 'Context', 'Answer'];
    
    const csvRows = [
      headers.join(','),
      ...filteredQuestions.map(q => {
        const answer = q.answer ? q.answer.answer_text : '';
        return [
          q.id,
          `"${q.question.replace(/"/g, '""')}"`,
          q.status,
          q.priority,
          `"${(q.source || '').replace(/"/g, '""')}"`,
          `"${(q.context || '').replace(/"/g, '""')}"`,
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
    link.setAttribute('download', `${selectedProject || 'project'}_questions.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get question stats
  const getQuestionStats = () => {
    const total = filteredQuestions.length;
    const answered = filteredQuestions.filter(q => q.status === 'answered').length;
    const partial = filteredQuestions.filter(q => q.status === 'partially_answered').length;
    const unanswered = filteredQuestions.filter(q => q.status === 'unanswered').length;
    
    return { total, answered, partial, unanswered };
  };

  const stats = getQuestionStats();

  return (
    <div className="container mx-auto  flex flex-col">
      <ColoredHeader
        label="View and Manage Questions"
        description="View current questions, their status, and answers"
        colorName="green-70"
      />

      {/* Main container with proper flex layout */}
      <div className="flex-1 flex flex-col min-h-0">
        <StylableContainer className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Project selector and filters - Fixed at top */}
          <div className="flex-shrink-0 mb-6">
            {/* Project Selector */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Project
                </label>
                <ProjectSelector 
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onProjectSelect={handleProjectSelect}
                  loading={projectsLoading}
                />
              </div>
              
              {selectedProject && (
                <div className="flex gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border transition-colors"
                    title="Refresh questions"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}
            </div>

            {selectedProject && (
              <>
                {/* Question Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Total</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Answered</p>
                    <p className="text-2xl font-bold text-green-600">{stats.answered}</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">Partial</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.partial}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Unanswered</p>
                    <p className="text-2xl font-bold text-red-600">{stats.unanswered}</p>
                  </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'All', icon: '❓', color: 'gray' },
                      { value: 'Unanswered', icon: '🔴', color: 'red' },
                      { value: 'Partially Answered', icon: '🟠', color: 'yellow' },
                      { value: 'Answered', icon: '🟢', color: 'green' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setStatusFilter(option.value)}
                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          statusFilter === option.value 
                            ? `bg-${option.color}-100 text-${option.color}-800 border-2 border-${option.color}-300`
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        <span className="mr-2">{option.icon}</span>
                        {option.value}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Main content area */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-2 text-gray-500">Loading questions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200 max-w-md">
                {error}
              </div>
            </div>
          ) : !selectedProject ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
                <p className="text-gray-600">Choose a project to view its questions and answers.</p>
              </div>
            </div>
          ) : filteredQuestions.length === 0 && questions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-amber-600 mb-8">No questions found for this project.</p>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating}
                  className={`btn-primary py-2 px-6 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGenerating ? 'Generating...' : 'Generate Questions for This Project'}
                </button>
              </div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Filter size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-blue-600 mb-4">No questions match your current filters.</p>
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setSearchQuery('');
                  }}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 relative">
              {/* Questions Table Section */}
              <div className="overflow-x-auto overflow-y-auto max-h-[500px]">

                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50 sticky top-0 z-10">
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
                  <tbody className="divide-y divide-gray-200 max-h-[500px] overflow-auto">
                    {filteredQuestions.map((question) => (
                      <tr 
                        key={question.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedQuestionId === question.id ? 'bg-green-50' : ''
                        }`}
                        onClick={() => handleQuestionClick(question.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {question.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-md">
                            <p className="truncate" title={question.question}>
                              {question.question}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatStatusDisplay(question.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            question.priority === 1 ? 'bg-red-100 text-red-800' :
                            question.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {question.priority || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs">
                            <p className="truncate" title={question.source}>
                              {question.source || 'Unknown'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


              <div className="mt-4 p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {filteredQuestions.length} of {questions.length} questions
                    {searchQuery && (
                      <span className="ml-2 text-blue-600">
                        (filtered by "{searchQuery}")
                      </span>
                    )}
                  </div>
                  <button
                    onClick={exportToCSV}
                    disabled={filteredQuestions.length === 0}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                  >
                    <Download size={16} />
                    <span>Download CSV ({filteredQuestions.length})</span>
                  </button>
                </div>
              </div>
              {/* Question Details Section - At the bottom of scrollable area */}
              {selectedQuestion && (
                <div 
                  ref={questionDetailsRef}
                  id="question-details"
                  className="flex-shrink-0 mt-8 mb-8 border-t-4 border-blue-500 bg-white rounded-lg shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3">
                          ID: {selectedQuestion.id}
                        </span>
                        Question Details
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedQuestionId(null);
                          setSelectedQuestion(null);
                        }}
                        className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border transition-colors"
                        title="Close details"
                      >
                        <X size={16} className="mr-2" />
                        Close
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-3 mb-4 flex items-center">
                          <span className="bg-blue-500 w-3 h-3 rounded-full mr-3"></span>
                          Question Information
                        </h4>
                        <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
                          <p className="text-gray-800 leading-relaxed">{selectedQuestion.question}</p>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-semibold text-gray-600 mb-2">Context:</h5>
                            <p className="text-gray-700 bg-white p-3 rounded-md border border-gray-200">
                              {selectedQuestion.context || 'No context provided'}
                            </p>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-semibold text-gray-600 mb-2">Source:</h5>
                            <p className="text-gray-700 bg-white p-3 rounded-md border border-gray-200">
                              {selectedQuestion.source || 'Unknown source'}
                            </p>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-semibold text-gray-600 mb-2">Priority:</h5>
                            <p className="text-gray-700 bg-white p-3 rounded-md border border-gray-200">
                              {selectedQuestion.priority || 'N/A'} (1 highest, 3 lowest)
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between border-b border-gray-300 pb-3 mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <span className="bg-green-500 w-3 h-3 rounded-full mr-3"></span>
                            Answer Status
                          </h4>
                          {formatStatusDisplay(selectedQuestion.status)}
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-semibold text-gray-600 mb-3">Answer:</h5>
                          {selectedQuestion.answer ? (
                            <div className="bg-white p-4 rounded-md border border-gray-200">
                              <p className="text-gray-800 leading-relaxed mb-4">
                                {selectedQuestion.answer.answer_text || 'No answer text'}
                              </p>
                              <div className="border-t border-gray-200 pt-4 space-y-2">
                                <p className="text-sm text-gray-600">
                                  <span className="font-semibold">Confidence:</span> 
                                  <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    {selectedQuestion.answer.confidence || 'N/A'}
                                  </span>
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-semibold">Date:</span> 
                                  <span className="ml-2 bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                    {selectedQuestion.answer.meeting_date || 'Unknown'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-blue-800">
                              <p className="font-medium">No answer available</p>
                              <p className="text-sm mt-1">This question has not been answered yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {generatingResult && generatingResult.status === 'success' && (
            <div className="flex-shrink-0 mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 font-medium">
                Question generation completed successfully! Generated {generatingResult.initial_questions_count || 0} questions.
              </p>
            </div>
          )}
        </StylableContainer>
      </div>
    </div>
  );
}