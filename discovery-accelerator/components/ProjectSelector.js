// ProjectSelector.js
'use client';

import { ChevronDown, Loader2 } from 'lucide-react';

export default function ProjectSelector({ 
  projects = [], 
  selectedProjectId = null, 
  onProjectSelect, 
  loading = false,
  placeholder = "Select a project..."
}) {
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleProjectChange = (e) => {
    const projectId = parseInt(e.target.value);
    if (projectId && onProjectSelect) {
      onProjectSelect(projectId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center py-2 text-gray-600 dark:text-gray-400">
        <Loader2 size={16} className="mr-2 animate-spin" />
        Loading projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-2 text-amber-600 dark:text-amber-400">
        No projects found. Please start a discovery process first.
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={selectedProjectId || ''}
        onChange={handleProjectChange}
        className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <ChevronDown size={16} className="text-gray-400" />
      </div>
    </div>
  );
}