// page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import ProjectSelector from '../../components/ProjectSelector';
import MetricCard from '../../components/MetricCard';
import ProgressChart from '../../components/ProgressChart';
import { fetchDiscoveryStatus } from '../../lib/api';

export default function DiscoveryStatusPage() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [discoveryStatus, setDiscoveryStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProjectSelect = (projectName, projectId) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
  };

  // Load discovery status when project changes
  useEffect(() => {
    const loadDiscoveryStatus = async () => {
      if (!selectedProjectId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetchDiscoveryStatus(selectedProjectId);
        
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
        <ProjectSelector onSelectProject={handleProjectSelect} />

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
              </div>
            ) : discoveryStatus ? (
              <div>
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
                          <div className="progress-container">
                            <div
                              className="progress-bar"
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
                  <ColoredHeader label="Transcripts Processed" colorName="green-50" />
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
      </StylableContainer>
    </div>
  );
}