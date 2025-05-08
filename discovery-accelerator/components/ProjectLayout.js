'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ColoredHeader from './ColoredHeader';
import StylableContainer from './StylableContainer';
import ProjectSelector from './ProjectSelector';
import { fetchProjects } from '../lib/api';

/**
 * Layout component for pages that require project selection
 */
export default function ProjectLayout({
  title,
  description,
  children,
  onProjectSelect,
  showProjectSelector = true
}) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetchProjects();
        
        if (response && response.status === 'success') {
          setProjects(response.projects || []);
          
          // Auto-select first project if available
          if (response.projects && response.projects.length > 0 && !selectedProject) {
            setSelectedProject(response.projects[0]);
            // Assuming project IDs start from 1
            setSelectedProjectId(1);
            
            // Call parent callback if provided
            if (onProjectSelect) {
              onProjectSelect(response.projects[0], 1);
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

    loadProjects();
  }, []);

  const handleProjectSelect = (projectName, projectId) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
    
    // Call parent callback if provided
    if (onProjectSelect) {
      onProjectSelect(projectName, projectId);
    }
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label={title}
        description={description}
        colorName="green-70"
      />

      <StylableContainer>
        {/* Project selector */}
        {showProjectSelector && (
          <ProjectSelector onSelectProject={handleProjectSelect} />
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Loading indicator */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            <p className="mt-2 text-gray-500">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-amber-600 mb-6">No projects found. Please start a discovery process first.</p>
            <button
              onClick={() => router.push('/start-discovery')}
              className="btn-primary py-2 px-6"
            >
              Start Discovery
            </button>
          </div>
        ) : (
          // Render children with project context
          <div className={showProjectSelector ? 'mt-6' : ''}>
            {children({
              projects,
              selectedProject,
              selectedProjectId
            })}
          </div>
        )}
      </StylableContainer>
    </div>
  );
}