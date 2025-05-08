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
  Loader2 
} from 'lucide-react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import { fetchProjects } from '../../lib/api';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

// Fetch projects on component mount
useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const response = await fetchProjects();
        
        if (response && response.status === 'success') {
          // Add sample metadata to projects for demonstration
          // In a real implementation, you would fetch this data from the backend
          const enhancedProjects = response.projects.map((project, index) => {
            // Try to parse project ID if it's embedded in the name (e.g., "Project-123")
            let id = index + 1;
            const idMatch = project.match(/[^a-zA-Z0-9](\d+)$/);
            if (idMatch) {
              id = parseInt(idMatch[1]);
            }
            
            return {
              id: id,
              name: project,
              status: getRandomStatus(),
              progress: Math.floor(Math.random() * 101),
              questions: Math.floor(Math.random() * 50) + 10,
              answeredQuestions: Math.floor(Math.random() * 50),
              transcripts: Math.floor(Math.random() * 10),
              createdAt: getRandomDate(new Date('2024-01-01'), new Date()),
              updatedAt: getRandomDate(new Date('2024-05-01'), new Date()),
            };
          });
          
          setProjects(enhancedProjects);
          setFilteredProjects(enhancedProjects);
        } else {
          setError(response.error || 'Failed to load projects');
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

  // Generate random date for demo projects
  const getRandomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

  // Generate random status for demo projects
  const getRandomStatus = () => {
    const statuses = ['active', 'completed', 'pending'];
    return statuses[Math.floor(Math.random() * statuses.length)];
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

  // Get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle size={12} className="mr-1" />
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <CheckCircle size={12} className="mr-1" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock size={12} className="mr-1" />
            Pending
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

  // Handle new project click
  const handleNewProject = () => {
    router.push('/start-discovery');
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Projects"
        description="View and manage all your discovery projects"
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
                <option value="progress">Progress</option>
              </select>
            </div>
          </div>
        </StylableContainer>
      )}

      {/* Projects list */}
      <StylableContainer>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 size={48} className="mx-auto animate-spin text-green-500" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
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
                        {getStatusBadge(project.status)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2 max-w-[100px]">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full" 
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <span>{project.progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(project.createdAt)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{project.answeredQuestions}</span>
                        <span className="mx-1">/</span>
                        <span>{project.questions}</span>
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
    </div>
  );
}