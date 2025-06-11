// app/discovery-status/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import ProjectSelector from '../../components/ProjectSelector';
import MetricCard from '../../components/MetricCard';
import ProgressChart from '../../components/ProgressChart';
import { fetchDiscoveryStatus, fetchProjects } from '../../lib/api';

export default function DiscoveryStatusPage() {
  const router = useRouter();
  
  // Projects state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(null);
  
  // Selected project state
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  
  // Discovery status state
  const [discoveryStatus, setDiscoveryStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      setProjectsError(null);
      console.log('Loading projects for discovery status page...');
      
      const response = await fetchProjects();
      console.log('Projects response:', response);
      
      if (response && response.status === 'success') {
        // Create enhanced project objects with IDs
        const enhancedProjects = response.projects.map((project, index) => {
          let id = index + 1;
          // Try to extract ID from project name if it follows a pattern
          const idMatch = project.match(/[^a-zA-Z0-9](\d+)$/);
          if (idMatch) {
            id = parseInt(idMatch[1]);
          }
          
          return {
            id: id,
            name: project
          };
        });
        
        console.log('Enhanced projects:', enhancedProjects);
        setProjects(enhancedProjects);
      } else {
        setProjectsError('Failed to load projects');
        console.error('Projects API returned error or no success status');
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setProjectsError('Failed to load projects. Please try again later.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectSelect = (projectId) => {
    console.log('Project selected:', projectId);
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project?.name);
    setSelectedProjectId(projectId);
  };

  // Load discovery status when project changes
  useEffect(() => {
    const loadDiscoveryStatus = async () => {
      if (!selectedProjectId) return;

      try {
        setLoading(true);
        setError(null);
        console.log('Loading discovery status for project:', selectedProjectId);
        
        const response = await fetchDiscoveryStatus(selectedProjectId);
        console.log('Discovery status response:', response);
        
        if (response && response.status === 'success') {
          setDiscoveryStatus(response.discovery_status || {});
        } else {
          setError('Failed to load discovery status');
        }
      } catch (err) {
        console.error('Error loading discovery status:', err);
        setError('Failed to load discovery status. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDiscoveryStatus();
  }, [selectedProjectId]);

  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (!discoveryStatus) return 0;
    
    const total = discoveryStatus.total_questions || 0;
    const unanswered = discoveryStatus.question_status?.unanswered || 0;
    const partiallyAnswered = discoveryStatus.question_status?.partially_answered || 0;
    
    if (total === 0) return 0;
    
    // Each partially answered question counts as half answered
    return 100 - ((unanswered + partiallyAnswered / 2) / total * 100);
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Discovery Status Dashboard"
        description="Check the current status of the discovery process"
        colorName="green-70"
      />

      <StylableContainer>
        {/* Project selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Project
          </label>
          <ProjectSelector 
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleProjectSelect}
            loading={projectsLoading}
            placeholder="Select a project..."
          />
          {projectsError && (
            <div className="mt-2 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
              {projectsError}
              <button 
                onClick={loadProjects}
                className="ml-2 text-red-800 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {selectedProject && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-2 text-gray-500">Loading discovery status...</p>
              </div>
            ) : error ? (
              <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
                {error}
                <button 
                  onClick={() => selectedProjectId && loadDiscoveryStatus()}
                  className="ml-2 text-red-800 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            ) : discoveryStatus ? (
              <div>
                {/* Project Name Display */}
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h2 className="text-xl font-semibold text-green-800">
                    Project: {selectedProject}
                  </h2>
                </div>

                {/* Discovery progress */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Discovery Progress</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <MetricCard 
                      label="Total Questions" 
                      value={discoveryStatus.total_questions || 0}
                    />
                    <MetricCard 
                      label="Answered Questions" 
                      value={discoveryStatus.question_status?.answered || 0}
                    />
                    <MetricCard 
                      label="Partially Answered" 
                      value={discoveryStatus.question_status?.partially_answered || 0}
                    />
                    <MetricCard 
                      label="Unanswered" 
                      value={discoveryStatus.question_status?.unanswered || 0}
                    />
                  </div>
                  
                  {/* Progress chart */}
                  <div className="mb-6">
                    <ProgressChart projectStatus={discoveryStatus} />
                  </div>
                  
                  {/* Completion status */}
                  {discoveryStatus.discovery_complete ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 font-medium mb-4">
                      ✅ Discovery Process Complete
                    </div>
                  ) : (
                    <div>
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 font-medium mb-4">
                        🔄 Discovery Process In Progress
                      </div>
                      
                      {/* Progress bar */}
                      {discoveryStatus.total_questions > 0 && (
                        <div className="mb-6">
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-green-600 h-4 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(calculateCompletionPercentage(), 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-center mt-2 text-gray-700 font-medium">
                            Estimated completion: {calculateCompletionPercentage().toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Transcripts processed */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Transcripts Processed</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <MetricCard 
                      label="Total Transcripts" 
                      value={discoveryStatus.transcript_count || 0}
                    />
                  </div>
                </div>
                
                {/* Links to other sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-green-700 font-medium mb-3">
                      Need to manage your discovery questions?
                    </p>
                    <button
                      onClick={() => router.push('/view-questions')}
                      className="btn-primary py-2 px-6"
                    >
                      Go to View Questions
                    </button>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-green-700 font-medium mb-3">
                      Want to process more transcript data?
                    </p>
                    <button
                      onClick={() => router.push('/process-transcripts')}
                      className="btn-primary py-2 px-6"
                    >
                      Go to Process Transcripts
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No discovery status available for this project.</p>
              </div>
            )}
          </>
        )}

        {/* No project selected state */}
        {!selectedProject && !projectsLoading && projects.length > 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Select a Project
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a project from the dropdown above to view its discovery status.
            </p>
          </div>
        )}
      </StylableContainer>
    </div>
  );
}