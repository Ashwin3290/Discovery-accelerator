// page.js
'use client';

import { useState } from 'react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import ProjectSelector from '../../components/ProjectSelector';

export default function ReportsPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const handleProjectSelect = (projectName, projectId) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
  };

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Discovery Reports"
        description="Generate and view reports for your discovery projects"
        colorName="green-70"
      />

      <StylableContainer>
        {/* Project selector */}
        <ProjectSelector onSelectProject={handleProjectSelect} />

        {selectedProject ? (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary Report Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-semibold mb-2">Summary Report</h3>
                <p className="text-gray-600 mb-4">
                  An overview of the discovery process with key metrics and findings.
                </p>
                <button className="btn-primary w-full">Generate Summary Report</button>
              </div>

              {/* Question Analysis Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-semibold mb-2">Question Analysis</h3>
                <p className="text-gray-600 mb-4">
                  Detailed analysis of questions, answers, and gaps in the discovery process.
                </p>
                <button className="btn-primary w-full">Generate Question Analysis</button>
              </div>

              {/* Transcript Insights Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-semibold mb-2">Transcript Insights</h3>
                <p className="text-gray-600 mb-4">
                  Key insights and themes extracted from meeting transcripts.
                </p>
                <button className="btn-primary w-full">Generate Transcript Insights</button>
              </div>

              {/* Requirements Document Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-semibold mb-2">Requirements Document</h3>
                <p className="text-gray-600 mb-4">
                  A comprehensive document outlining all requirements gathered during discovery.
                </p>
                <button className="btn-primary w-full">Generate Requirements Document</button>
              </div>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
              <p className="font-medium">Note:</p>
              <p>
                Reports will be generated based on the current state of your discovery project.
                Make sure all transcripts have been processed and questions have been answered
                for the most accurate reports.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Select a project to view available reports.</p>
          </div>
        )}
      </StylableContainer>
    </div>
  );
}