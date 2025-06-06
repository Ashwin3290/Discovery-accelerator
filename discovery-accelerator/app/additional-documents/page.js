'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  Eye, 
  BarChart, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  Download,
  Loader2,
  Plus,
  Settings,
  Calendar
} from 'lucide-react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import AdditionalDocumentUpload from '../../components/AdditionalDocumentUpload';
import AnswersBySource from '../../components/AnswersBySource';
import ProjectSelector from '../../components/ProjectSelector';
import { 
  fetchProjects, 
  fetchProjectProgress, 
  fetchUnansweredQuestions,
  fetchAnswersBySource
} from '../../lib/api';

export default function AdditionalDocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId');

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ? parseInt(initialProjectId) : null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectProgress, setProjectProgress] = useState(null);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [answersSummary, setAnswersSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnswersModal, setShowAnswersModal] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load project data when selected project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData();
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetchProjects();
      
      if (response && response.status === 'success') {
        // Create enhanced project objects with IDs
        const enhancedProjects = response.projects.map((project, index) => {
          let id = index + 1;
          const idMatch = project.match(/[^a-zA-Z0-9](\d+)$/);
          if (idMatch) {
            id = parseInt(idMatch[1]);
          }
          
          return {
            id: id,
            name: project
          };
        });
        
        setProjects(enhancedProjects);
        
        // If we have an initial project ID, find and set the project
        if (initialProjectId) {
          const project = enhancedProjects.find(p => p.id === parseInt(initialProjectId));
          if (project) {
            setSelectedProject(project);
          }
        }
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async () => {
    if (!selectedProjectId) return;

    try {
      setLoading(true);
      setError(null);

      // Load multiple data sources in parallel
      const [progressResponse, questionsResponse, answersResponse] = await Promise.all([
        fetchProjectProgress(selectedProjectId).catch(err => ({ error: err.message })),
        fetchUnansweredQuestions(selectedProjectId).catch(err => ({ error: err.message })),
        fetchAnswersBySource(selectedProjectId).catch(err => ({ error: err.message }))
      ]);

      // Set project progress
      if (progressResponse && progressResponse.status === 'success') {
        setProjectProgress(progressResponse);
      }

      // Set unanswered questions
      if (questionsResponse && questionsResponse.status === 'success') {
        setUnansweredQuestions(questionsResponse.unanswered_questions || []);
      }

      // Set answers summary
      if (answersResponse && answersResponse.status === 'success') {
        setAnswersSummary(answersResponse.summary);
      }

    } catch (err) {
      console.error('Error loading project data:', err);
      setError('Failed to load project data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('projectId', projectId.toString());
    window.history.pushState({}, '', url);
  };

  const handleUploadComplete = (result) => {
    console.log('Upload completed:', result);
    setShowUploadModal(false);
    // Reload project data to reflect changes
    if (selectedProjectId) {
      loadProjectData();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCompletionColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Additional Documents"
        description="Add and manage additional documents for your discovery projects"
        colorName="purple-70"
      />

      {/* Project Selection */}
      <StylableContainer className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Project
            </label>
            <ProjectSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleProjectSelect}
              loading={loading}
            />
          </div>
          
          {selectedProject && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary flex items-center"
              >
                <Upload size={16} className="mr-2" />
                Add Documents
              </button>
              <button
                onClick={() => setShowAnswersModal(true)}
                className="btn-secondary flex items-center"
              >
                <Eye size={16} className="mr-2" />
                View Answers
              </button>
            </div>
          )}
        </div>
      </StylableContainer>

      {/* Project Overview */}
      {selectedProject && projectProgress && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Discovery Status */}
          <StylableContainer>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <BarChart size={20} className="mr-2 text-blue-600 dark:text-blue-400" />
              Discovery Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Questions</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {projectProgress.questions?.total || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
                <span className={`font-medium ${getCompletionColor(projectProgress.questions?.completion_percentage || 0)}`}>
                  {projectProgress.questions?.completion_percentage || 0}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${projectProgress.questions?.completion_percentage || 0}%` }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {formatDate(projectProgress.created_at)}
              </div>
            </div>
          </StylableContainer>

          {/* Answer Sources */}
          <StylableContainer>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <FileText size={20} className="mr-2 text-green-600 dark:text-green-400" />
              Answer Sources
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Answers</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {answersSummary?.total_answers || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">From Documents</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {answersSummary?.document_answers || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">From Transcripts</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {answersSummary?.transcript_answers || 0}
                </span>
              </div>
              
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAnswersModal(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                >
                  <Eye size={12} className="mr-1" />
                  View All Answers
                </button>
              </div>
            </div>
          </StylableContainer>

          {/* Additional Documents */}
          <StylableContainer>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Upload size={20} className="mr-2 text-purple-600 dark:text-purple-400" />
              Additional Documents
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Documents Added</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {projectProgress.additional_documents?.count || 0}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Add technical specifications, architecture documents, or other materials to help answer remaining questions.
              </div>
              
              <button
                onClick={() => setShowUploadModal(true)}
                className="w-full mt-3 btn-primary flex items-center justify-center"
              >
                <Plus size={16} className="mr-2" />
                Add Documents
              </button>
            </div>
          </StylableContainer>
        </div>
      )}

      {/* Unanswered Questions */}
      {selectedProject && unansweredQuestions.length > 0 && (
        <StylableContainer className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <AlertCircle size={20} className="mr-2 text-yellow-600 dark:text-yellow-400" />
              Unanswered Questions ({unansweredQuestions.length})
            </h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary text-sm flex items-center"
            >
              <Upload size={14} className="mr-1" />
              Add Documents to Answer
            </button>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {unansweredQuestions.slice(0, 10).map((question, index) => (
              <div key={question.id || index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {question.question}
                    </p>
                    {question.context && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Context: {question.context}
                      </p>
                    )}
                    {question.source && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Source: {question.source}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      question.priority === 1 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      question.priority === 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      Priority {question.priority || 3}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {unansweredQuestions.length > 10 && (
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                ... and {unansweredQuestions.length - 10} more questions
              </div>
            )}
          </div>
        </StylableContainer>
      )}

      {/* Empty State */}
      {!selectedProject && !loading && (
        <StylableContainer>
          <div className="text-center py-12">
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Select a Project
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Choose a project from the dropdown above to add additional documents and view discovery progress.
            </p>
          </div>
        </StylableContainer>
      )}

      {/* Loading State */}
      {loading && (
        <StylableContainer>
          <div className="text-center py-12">
            <Loader2 size={48} className="mx-auto animate-spin text-purple-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading project data...</p>
          </div>
        </StylableContainer>
      )}

      {/* Error State */}
      {error && (
        <StylableContainer>
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button 
              className="btn-secondary"
              onClick={() => selectedProjectId ? loadProjectData() : loadProjects()}
            >
              Try Again
            </button>
          </div>
        </StylableContainer>
      )}

      {/* Modals */}
      {showUploadModal && selectedProject && (
        <AdditionalDocumentUpload
          projectId={selectedProjectId}
          projectName={selectedProject.name}
          onProcessingComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {showAnswersModal && selectedProjectId && (
        <AnswersBySource
          projectId={selectedProjectId}
          onClose={() => setShowAnswersModal(false)}
        />
      )}
    </div>
  );
}