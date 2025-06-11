// app/reports/page.js
'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, BarChart3, Users, CheckCircle } from 'lucide-react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import ProjectSelector from '../../components/ProjectSelector';
import { fetchProjects, fetchDiscoveryReport } from '../../lib/api';

export default function ReportsPage() {
  // Projects state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(null);
  
  // Selected project state
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  
  // Report generation state
  const [generatingReport, setGeneratingReport] = useState(null);
  const [reportError, setReportError] = useState(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      setProjectsError(null);
      console.log('Loading projects for reports page...');
      
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
    setReportError(null); // Clear any previous errors
  };

  const handleGenerateReport = async (reportType) => {
    if (!selectedProjectId) {
      setReportError('Please select a project first');
      return;
    }

    try {
      setGeneratingReport(reportType);
      setReportError(null);
      console.log(`Generating ${reportType} report for project:`, selectedProjectId);

      // For now, we'll use the discovery report endpoint for all types
      // You can implement specific endpoints for different report types later
      const response = await fetchDiscoveryReport(selectedProjectId);
      console.log('Report response:', response);

      if (response && response.status === 'success') {
        // Handle successful report generation
        // You could download the report, show it in a modal, etc.
        console.log('Report generated successfully:', response);
        
        // For demonstration, we'll show a success message
        alert(`${reportType} report generated successfully! Check the console for details.`);
      } else {
        setReportError(`Failed to generate ${reportType} report`);
      }
    } catch (err) {
      console.error(`Error generating ${reportType} report:`, err);
      setReportError(`Failed to generate ${reportType} report. Please try again.`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const reportTypes = [
    {
      id: 'summary',
      title: 'Summary Report',
      description: 'An overview of the discovery process with key metrics and findings.',
      icon: <BarChart3 size={24} className="text-blue-600" />,
      color: 'blue'
    },
    {
      id: 'questions',
      title: 'Question Analysis',
      description: 'Detailed analysis of questions, answers, and gaps in the discovery process.',
      icon: <FileText size={24} className="text-green-600" />,
      color: 'green'
    },
    {
      id: 'transcripts',
      title: 'Transcript Insights',
      description: 'Key insights and themes extracted from meeting transcripts.',
      icon: <Users size={24} className="text-purple-600" />,
      color: 'purple'
    },
    {
      id: 'requirements',
      title: 'Requirements Document',
      description: 'A comprehensive document outlining all requirements gathered during discovery.',
      icon: <CheckCircle size={24} className="text-orange-600" />,
      color: 'orange'
    }
  ];

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Discovery Reports"
        description="Generate and view reports for your discovery projects"
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

        {/* Report error */}
        {reportError && (
          <div className="mb-6 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
            {reportError}
          </div>
        )}

        {selectedProject ? (
          <div className="mt-6">
            {/* Project Name Display */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="text-xl font-semibold text-green-800">
                Reports for: {selectedProject}
              </h2>
            </div>

            {/* Report cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reportTypes.map((report) => (
                <div 
                  key={report.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {report.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {report.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {report.description}
                      </p>
                      <button 
                        onClick={() => handleGenerateReport(report.title)}
                        disabled={generatingReport === report.title}
                        className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${report.color}-600 hover:bg-${report.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${report.color}-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
                      >
                        {generatingReport === report.title ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download size={16} className="mr-2" />
                            Generate {report.title}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Information note */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-blue-700 dark:text-blue-300">
              <p className="font-medium">📋 Note:</p>
              <p>
                Reports will be generated based on the current state of your discovery project.
                Make sure all transcripts have been processed and questions have been answered
                for the most accurate reports.
              </p>
            </div>

            {/* Additional actions */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-3">
                  Need to check project status first?
                </p>
                <button
                  onClick={() => window.location.href = `/discovery-status?projectId=${selectedProjectId}`}
                  className="btn-secondary py-2 px-6"
                >
                  View Discovery Status
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-3">
                  Want to add more documents?
                </p>
                <button
                  onClick={() => window.location.href = `/additional-documents?projectId=${selectedProjectId}`}
                  className="btn-secondary py-2 px-6"
                >
                  Add Documents
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            {projectsLoading ? (
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mb-2"></div>
                <p className="text-gray-500">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div>
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Projects Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start a discovery process first to generate reports.
                </p>
                <button
                  onClick={() => window.location.href = '/start-discovery'}
                  className="btn-primary"
                >
                  Start Discovery
                </button>
              </div>
            ) : (
              <div>
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Select a Project
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a project from the dropdown above to view available reports.
                </p>
              </div>
            )}
          </div>
        )}
      </StylableContainer>
    </div>
  );
}