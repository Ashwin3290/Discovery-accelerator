// ProjectSelector.js
'use client';

import { useState, useEffect } from 'react';
import { fetchProjects } from '../lib/api';

export default function ProjectSelector({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const data = await fetchProjects();
        setProjects(data.projects || []);
        
        // Select first project by default if exists
        if (data.projects && data.projects.length > 0) {
          setSelectedProject(data.projects[0]);
          onSelectProject && onSelectProject(data.projects[0], 1); // Assume ID is 1 for first project
        }
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [onSelectProject]);

  const handleProjectChange = (e) => {
    const projectName = e.target.value;
    setSelectedProject(projectName);
    
    // Find project ID (simple assumption that IDs start from 1)
    const projectId = projects.findIndex(p => p === projectName) + 1;
    onSelectProject && onSelectProject(projectName, projectId);
  };

  if (loading) {
    return <div className="py-2">Loading projects...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-2">{error}</div>;
  }

  if (projects.length === 0) {
    return <div className="py-2 text-amber-600">No projects found. Please start a discovery process first.</div>;
  }

  return (
    <div className="mb-4">
      <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-1">
        Select Project
      </label>
      <select
        id="project-select"
        value={selectedProject}
        onChange={handleProjectChange}
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {projects.map((project, index) => (
          <option key={index} value={project}>
            {project}
          </option>
        ))}
      </select>
    </div>
  );
}