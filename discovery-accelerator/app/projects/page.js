// app/projects/page.js - Updated with Live Progress Calculation
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Filter, 
  ChevronDown, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  BarChart, 
  FileText, 
  MoreHorizontal, 
  Loader2,
  Upload,
  Download,
  Settings,
  RefreshCw
} from 'lucide-react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import AdditionalDocumentUpload from '../../components/AdditionalDocumentUpload';
import AnswersBySource from '../../components/AnswersBySource';
import { fetchProjects, fetchProjectProgress } from '../../lib/api';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdditionalDocs, setShowAdditionalDocs] = useState(false);
  const [showAnswersBySource, setShowAnswersBySource] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState(null);

  // 🎯 ENHANCED COMPLETION CALCULATION WITH WEIGHTAGE
  const calculateProjectCompletion = (progressData) => {
    if (!progressData || !progressData.questions) {
      return {
        percentage: 0,
        totalQuestions: 0,
        answeredQuestions: 0,
        partiallyAnswered: 0,
        unanswered: 0,
        status: 'unknown'
      };
    }

    const total = progressData.questions.total || 0;
    const byStatus = progressData.questions.by_status || {};
    
    const answered = byStatus.answered || 0;
    const partiallyAnswered = byStatus.partially_answered || 0;
    const unanswered = byStatus.unanswered || 0;

    if (total === 0) {
      return {
        percentage: 0,
        totalQuestions: 0,
        answeredQuestions: 0,
        partiallyAnswered: 0,
        unanswered: 0,
        status: 'no-questions'
      };
    }

    // 🎯 WEIGHTAGE SYSTEM
    // Fully answered questions: 100% weight (1.0)
    // Partially answered questions: 60% weight (0.6) - adjustable
    // Unanswered questions: 0% weight (0.0)
    const PARTIAL_ANSWER_WEIGHT = 0.6;
    
    const weightedScore = (answered * 1.0) + (partiallyAnswered * PARTIAL_ANSWER_WEIGHT);
    const percentage = Math.round((weightedScore / total) * 100);

    // Determine project status based on completion
    let status = 'active';
    if (percentage >= 95) {
      status = 'completed';
    } else if (percentage < 10) {
      status = 'pending';
    }

    return {
      percentage: Math.min(percentage, 100), // Cap at 100%
      totalQuestions: total,
      answeredQuestions: answered,
      partiallyAnswered: partiallyAnswered,
      unanswered: unanswered,
      status: status,
      weightedScore: weightedScore.toFixed(1)
    };
  };

  // 🚀 FETCH PROJECTS WITH LIVE PROGRESS DATA
  useEffect(() => {
    const loadProjectsWithProgress = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading projects with live progress data...');
        
        // Step 1: Fetch basic project list
        const projectsResponse = await fetchProjects();
        
        if (!projectsResponse || projectsResponse.status !== 'success') {
          setError(projectsResponse?.error || 'Failed to load projects');
          return;
        }

        console.log('✅ Basic projects loaded:', projectsResponse.projects.length);

        // Step 2: Create enhanced project objects with IDs
        const basicProjects = projectsResponse.projects.map((project, index) => {
          let id = index + 1;
          const idMatch = project.match(/[^a-zA-Z0-9](\d+)$/);
          if (idMatch) {
            id = parseInt(idMatch[1]);
          }
          
          return {
            id: id,
            name: project,
            // Default values while loading progress
            status: 'loading',
            progress: 0,
            totalQuestions: 0,
            answeredQuestions: 0,
            partiallyAnswered: 0,
            unanswered: 0,
            transcripts: 0,
            createdAt: new Date(), // Will be updated with real data if available
            updatedAt: new Date(),
            progressLoaded: false
          };
        });

        setProjects(basicProjects);
        setFilteredProjects(basicProjects);

        // Step 3: Fetch progress data for each project
        console.log('🔄 Loading progress data for each project...');
        setProgressLoading(true);
        
        const enhancedProjects = await Promise.all(
          basicProjects.map(async (project) => {
            try {
              console.log(`📊 Fetching progress for project ${project.id}: ${project.name}`);
              const progressData = await fetchProjectProgress(project.id);
              
              if (progressData && progressData.status === 'success') {
                const completion = calculateProjectCompletion(progressData);
                console.log(`✅ Progress loaded for ${project.name}:`, completion);
                
                return {
                  ...project,
                  status: completion.status,
                  progress: completion.percentage,
                  totalQuestions: completion.totalQuestions,
                  answeredQuestions: completion.answeredQuestions,
                  partiallyAnswered: completion.partiallyAnswered,
                  unanswered: completion.unanswered,
                  transcripts: progressData.answers?.total || 0,
                  additionalDocs: progressData.additional_documents?.count || 0,
                  createdAt: progressData.created_at ? new Date(progressData.created_at) : new Date(),
                  progressLoaded: true,
                  weightedScore: completion.weightedScore,
                  discoveryStatus: progressData.discovery_status || {}
                };
              } else {
                console.log(`⚠️ No progress data for ${project.name}`);
                return {
                  ...project,
                  status: 'unknown',
                  progressLoaded: true
                };
              }
            } catch (error) {
              console.error(`❌ Error loading progress for ${project.name}:`, error);
              return {
                ...project,
                status: 'error',
                progressLoaded: true
              };
            }
          })
        );

        console.log('🎉 All project progress loaded:', enhancedProjects);
        setProjects(enhancedProjects);
        setFilteredProjects(enhancedProjects);

      } catch (err) {
        console.error('❌ Error loading projects:', err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
        setProgressLoading(false);
      }
    };

    loadProjectsWithProgress();
  }, []);

  // 🔄 REFRESH PROGRESS DATA
  const refreshProgressData = async () => {
    if (projects.length === 0) return;
    
    setProgressLoading(true);
    console.log('🔄 Refreshing progress data...');
    
    try {
      const updatedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            const progressData = await fetchProjectProgress(project.id);
            
            if (progressData && progressData.status === 'success') {
              const completion = calculateProjectCompletion(progressData);
              
              return {
                ...project,
                status: completion.status,
                progress: completion.percentage,
                totalQuestions: completion.totalQuestions,
                answeredQuestions: completion.answeredQuestions,
                partiallyAnswered: completion.partiallyAnswered,
                unanswered: completion.unanswered,
                transcripts: progressData.answers?.total || 0,
                additionalDocs: progressData.additional_documents?.count || 0,
                weightedScore: completion.weightedScore,
                progressLoaded: true
              };
            }
            return project;
          } catch (error) {
            console.error(`Error refreshing ${project.name}:`, error);
            return project;
          }
        })
      );
      
      setProjects(updatedProjects);
      setFilteredProjects(updatedProjects);
      console.log('✅ Progress data refreshed');
    } catch (error) {
      console.error('❌ Error refreshing progress data:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  // Filter and sort projects when filter criteria change
  useEffect(() => {
    let result = [...projects];
    
    // Filter by search query
    if (searchQuery) {
      result = result.filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(project => project.status === statusFilter);
    }
    
    // Sort projects
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'progress':
        result.sort((a, b) => b.progress - a.progress);
        break;
      case 'questions':
        result.sort((a, b) => b.totalQuestions - a.totalQuestions);
        break;
      default:
        break;
    }
    
    setFilteredProjects(result);
  }, [projects, searchQuery, statusFilter, sortBy]);

  // Format date to display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 🎨 ENHANCED STATUS BADGES WITH PROGRESS INFO
  const getStatusBadge = (project) => {
    if (!project.progressLoaded) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          <Loader2 size={12} className="mr-1 animate-spin" />
          Loading...
        </span>
      );
    }

    switch (project.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle size={12} className="mr-1" />
            Completed
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Clock size={12} className="mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <AlertCircle size={12} className="mr-1" />
            Pending
          </span>
        );
      case 'no-questions':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <FileText size={12} className="mr-1" />
            No Questions
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle size={12} className="mr-1" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <AlertCircle size={12} className="mr-1" />
            Unknown
          </span>
        );
    }
  };

  // 📊 ENHANCED PROGRESS BAR WITH VISUAL INDICATORS
  const getProgressBar = (project) => {
    if (!project.progressLoaded) {
      return (
        <div className="flex items-center">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2 max-w-[100px]">
            <div className="bg-gray-400 h-2.5 rounded-full animate-pulse" style={{ width: '30%' }}></div>
          </div>
          <span className="text-gray-400">--</span>
        </div>
      );
    }

    const getProgressColor = (percentage) => {
      if (percentage >= 90) return 'bg-green-600';
      if (percentage >= 70) return 'bg-blue-600';
      if (percentage >= 40) return 'bg-yellow-600';
      return 'bg-red-600';
    };

    return (
      <div className="flex items-center" title={`${project.answeredQuestions} answered, ${project.partiallyAnswered} partial, ${project.unanswered} unanswered`}>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2 max-w-[100px]">
          <div 
            className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor(project.progress)}`}
            style={{ width: `${Math.max(project.progress, 2)}%` }}
          ></div>
        </div>
        <span className="font-medium">{project.progress}%</span>
      </div>
    );
  };

  // Handle new project click
  const handleNewProject = () => {
    router.push('/start-discovery');
  };

  // Handle additional documents upload
  const handleAdditionalDocs = (projectId, projectName) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    setShowAdditionalDocs(true);
  };

  // Handle view answers by source
  const handleViewAnswersBySource = (projectId) => {
    setSelectedProjectId(projectId);
    setShowAnswersBySource(true);
  };

  // Handle additional document processing complete
  const handleProcessingComplete = (result) => {
    console.log('Processing completed:', result);
    // Refresh progress data to reflect changes
    refreshProgressData();
  };

  // Close modals
  const closeModals = () => {
    setShowAdditionalDocs(false);
    setShowAnswersBySource(false);
    setSelectedProjectId(null);
    setSelectedProjectName(null);
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Projects"
        description="View and manage all your discovery projects with live progress tracking"
        colorName="green-70"
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Refresh button */}
          <button
            className={`btn-secondary py-2 flex items-center ${progressLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={refreshProgressData}
            disabled={progressLoading}
            title="Refresh progress data"
          >
            <RefreshCw size={16} className={`mr-1 ${progressLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Filter button */}
          <button
            className="btn-secondary py-2 flex items-center"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} className="mr-1" />
            Filters
            <ChevronDown size={16} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Create new project button */}
          <button
            className="btn-primary py-2 flex items-center ml-auto sm:ml-0"
            onClick={handleNewProject}
          >
            <Plus size={18} className="mr-1" />
            New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <StylableContainer className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-control"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="no-questions">No Questions</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-control"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="progress">Progress (High to Low)</option>
                <option value="questions">Questions (Most to Least)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress Info
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400 pt-2">
                <div>• Partial answers: 60% weight</div>
                <div>• Full answers: 100% weight</div>
              </div>
            </div>
          </div>
        </StylableContainer>
      )}

      {/* Projects list */}
      <StylableContainer>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 size={48} className="mx-auto animate-spin text-green-500" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects with progress data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-red-500" />
            <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
            <button 
              className="mt-4 btn-secondary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all' 
                ? 'No projects match your filters'
                : 'No projects found. Create your first project to get started.'
              }
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button 
                className="mt-4 btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </button>
            )}
            {!searchQuery && statusFilter === 'all' && (
              <button 
                className="mt-4 btn-primary"
                onClick={handleNewProject}
              >
                Create New Project
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
                {progressLoading && (
                  <span className="ml-2 text-sm text-blue-600">
                    <Loader2 size={14} className="inline animate-spin mr-1" />
                    Updating progress...
                  </span>
                )}
              </h2>
            </div>
            
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Project Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Progress
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hidden md:table-cell">
                      Created
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hidden lg:table-cell">
                      Questions
                    </th>
                    <th scope="col" className="relative px-3 py-3.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredProjects.map((project) => (
                    <tr 
                      key={project.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <Link 
                          href={`/view-questions?projectId=${project.id}`}
                          className="hover:text-green-600 dark:hover:text-green-400"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {getStatusBadge(project)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {getProgressBar(project)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(project.createdAt)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        {project.progressLoaded ? (
                          <div className="space-y-1">
                            <div>
                              <span className="text-green-600 dark:text-green-400 font-medium">{project.answeredQuestions}</span>
                              {project.partiallyAnswered > 0 && (
                                <>
                                  <span className="mx-1">+</span>
                                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">{project.partiallyAnswered}↗</span>
                                </>
                              )}
                              <span className="mx-1">/</span>
                              <span>{project.totalQuestions}</span>
                            </div>
                            {project.weightedScore && (
                              <div className="text-xs text-gray-400" title="Weighted score considering partial answers">
                                Score: {project.weightedScore}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Loading...</span>
                        )}
                      </td>
                      <td className="relative whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <Link
                            href={`/view-questions?projectId=${project.id}`}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            title="View Questions"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link
                            href={`/discovery-status?projectId=${project.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="View Status"
                          >
                            <BarChart size={18} />
                          </Link>
                          <button
                            onClick={() => handleAdditionalDocs(project.id, project.name)}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                            title="Add Documents"
                          >
                            <Upload size={18} />
                          </button>
                          <button
                            onClick={() => handleViewAnswersBySource(project.id)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                            title="View Answers by Source"
                          >
                            <Download size={18} />
                          </button>
                          <div className="relative inline-block text-left">
                            <button
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              title="More Options"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </StylableContainer>

      {/* Additional Documents Modal */}
      {showAdditionalDocs && selectedProjectId && (
        <AdditionalDocumentUpload
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          onProcessingComplete={handleProcessingComplete}
          onClose={closeModals}
        />
      )}

      {/* Answers by Source Modal */}
      {showAnswersBySource && selectedProjectId && (
        <AnswersBySource
          projectId={selectedProjectId}
          onClose={closeModals}
        />
      )}
    </div>
  );
}