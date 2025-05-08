// ProjectContext.js
'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { fetchProjects } from '@/lib/api';

// Create the context
const ProjectContext = createContext();

// Custom hook to use the project context
export function useProject() {
  return useContext(ProjectContext);
}

// Provider component
export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Load projects on initial render
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

  // Function to select a project
  const selectProject = (projectName, projectId) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
  };

  // Function to refresh the projects list
  const refreshProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchProjects();
      
      if (response && response.status === 'success') {
        setProjects(response.projects || []);
      } else {
        setError('Failed to refresh projects');
      }
    } catch (err) {
      console.error('Error refreshing projects:', err);
      setError('Failed to refresh projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Value object for the context
  const value = {
    projects,
    loading,
    error,
    selectedProject,
    selectedProjectId,
    selectProject,
    refreshProjects
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export default ProjectContext;