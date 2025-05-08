/**
 * Handle file uploads for SOW and additional documents
 * 
 * This utility handles the specifics of file uploads to the FastAPI backend
 */

import { processDocuments, startDiscovery } from './api';

/**
 * Uploads files to create a new discovery project
 * @param {string} projectName - The name of the project
 * @param {File} sowFile - The SOW document file
 * @param {File[]} additionalFiles - Additional documents
 * @param {boolean} generateQuestions - Whether to generate questions immediately
 * @returns {Promise<Object>} Upload result
 */
export async function uploadProjectFiles(projectName, sowFile, additionalFiles = [], generateQuestions = true) {
  try {
    // Validate inputs
    if (!projectName || !sowFile) {
      throw new Error('Project name and SOW document are required');
    }
    
    // Validate file types
    validateFileTypes(sowFile, additionalFiles);
    
    // Choose the appropriate API endpoint based on whether we want to generate questions
    const uploadFunction = generateQuestions ? startDiscovery : processDocuments;
    
    // Process the request
    const result = await uploadFunction(projectName, sowFile, additionalFiles);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error uploading files:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during upload'
    };
  }
}

/**
 * Validates file types
 * @param {File} sowFile - The SOW document
 * @param {File[]} additionalFiles - Additional documents
 */
function validateFileTypes(sowFile, additionalFiles) {
  // SOW document must be PDF or DOCX
  const validSowTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!validSowTypes.includes(sowFile.type)) {
    throw new Error('SOW document must be a PDF or DOCX file');
  }
  
  // Additional files can be PDF, DOCX, PPTX, JPG, PNG
  const validAdditionalTypes = [
    ...validSowTypes,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png'
  ];
  
  for (const file of additionalFiles) {
    if (!validAdditionalTypes.includes(file.type)) {
      throw new Error(`Invalid file type for ${file.name}. Supported formats are PDF, DOCX, PPTX, JPG, and PNG.`);
    }
  }
}

/**
 * Saves uploaded files to the server
 * This is an example of how you might handle direct file uploads
 * @param {string} projectName - Project name
 * @param {File} sowFile - SOW document
 * @param {File[]} additionalFiles - Additional files
 * @returns {Promise<Object>} Paths to saved files
 */
export async function saveFilesToServer(projectName, sowFile, additionalFiles = []) {
  // This function would typically upload files to a server endpoint
  // For the FastAPI backend, we're using FormData directly in the API calls
  
  // Placeholder for demonstration
  console.log(`Would save ${sowFile.name} and ${additionalFiles.length} additional files for project ${projectName}`);
  
  // In a real implementation, this might upload files to a temporary storage
  // and return paths that can be used in subsequent API calls
  return {
    sowPath: `/uploads/${projectName}/${sowFile.name}`,
    additionalPaths: additionalFiles.map(file => `/uploads/${projectName}/${file.name}`)
  };
}