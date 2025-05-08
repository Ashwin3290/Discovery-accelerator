// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Makes a request to the API
 * @param {string} endpoint - The API endpoint
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {Object} data - Data to send in the request body
 * @param {FormData} formData - Form data to send (for file uploads)
 * @returns {Promise<Object>} The API response
 */
async function apiRequest(endpoint, method = 'GET', data = null, formData = null) {
  const url = `${API_URL}/${endpoint}`;
  
  const options = {
    method: method.toUpperCase(),
    headers: {},
  };

  if (data && !formData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  if (formData) {
    options.body = formData;
    // No Content-Type header for FormData, browser will set it with boundary
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Fetches the list of projects
 * @returns {Promise<Object>} Projects list
 */
export async function fetchProjects() {
  return apiRequest('list_projects');
}

/**
 * Creates a new project by processing documents
 * @param {string} projectName - The name of the project
 * @param {File} sowFile - The SOW document file
 * @param {File[]} additionalFiles - Additional documents
 * @returns {Promise<Object>} Response with project details
 */
export async function processDocuments(projectName, sowFile, additionalFiles = []) {
  const formData = new FormData();
  formData.append('project_name', projectName);
  formData.append('sow_file', sowFile);
  
  if (additionalFiles.length > 0) {
    additionalFiles.forEach((file, index) => {
      formData.append(`additional_file_${index}`, file);
    });
  }
  
  return apiRequest('process_documents', 'POST', null, formData);
}

/**
 * Start discovery process
 * @param {string} projectName - The name of the project
 * @param {File} sowFile - The SOW document file
 * @param {File[]} additionalFiles - Additional documents
 * @returns {Promise<Object>} Response with project details
 */
export async function startDiscovery(projectName, sowFile, additionalFiles = []) {
  const formData = new FormData();
  formData.append('project_name', projectName);
  formData.append('sow_file', sowFile);
  
  if (additionalFiles.length > 0) {
    additionalFiles.forEach((file, index) => {
      formData.append(`additional_file_${index}`, file);
    });
  }
  
  return apiRequest('start_discovery', 'POST', null, formData);
}

/**
 * Processes a transcript for a project
 * @param {number} projectId - The project ID
 * @param {string} transcriptText - The transcript text
 * @returns {Promise<Object>} Response with processing results
 */
export async function processTranscript(projectId, transcriptText) {
  const data = {
    project_id: projectId,
    transcript_text: transcriptText
  };
  
  return apiRequest('process_transcript', 'POST', data);
}

/**
 * Fetches questions for a project
 * @param {number} projectId - The project ID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Object>} Questions list
 */
export async function fetchQuestions(projectId, status = null) {
  let endpoint = `get_questions/${projectId}`;
  
  if (status) {
    endpoint += `?status=${status}`;
  }
  
  return apiRequest(endpoint);
}

/**
 * Generates questions for a project
 * @param {number} projectId - The project ID
 * @returns {Promise<Object>} Generated questions
 */
export async function generateQuestions(projectId) {
  const data = {
    project_id: projectId
  };
  
  return apiRequest('generate_questions_by_id', 'POST', data);
}

/**
 * Fetches the discovery status for a project
 * @param {number} projectId - The project ID
 * @returns {Promise<Object>} Discovery status
 */
export async function fetchDiscoveryStatus(projectId) {
  return apiRequest(`discovery_status/${projectId}`);
}

/**
 * Fetches the SOW data for a project
 * @param {number} projectId - The project ID
 * @returns {Promise<Object>} SOW data
 */
export async function fetchSowData(projectId) {
  return apiRequest(`get_sow_data/${projectId}`);
}

/**
 * Fetches a discovery report for a project
 * @param {number} projectId - The project ID
 * @returns {Promise<Object>} Discovery report
 */
export async function fetchDiscoveryReport(projectId) {
  return apiRequest(`discovery_report/${projectId}`);
}

/**
 * Performs a query against a project
 * @param {string} projectName - The project name
 * @param {string} query - The query text
 * @param {number} nResults - Number of results to return
 * @returns {Promise<Object>} Query results
 */
export async function queryProject(projectName, query, nResults = 5) {
  const data = {
    project_name: projectName,
    query,
    n_results: nResults
  };
  
  return apiRequest('query_project', 'POST', data);
}

/**
 * Gets project statistics
 * @param {string} projectName - The project name
 * @returns {Promise<Object>} Project statistics
 */
export async function fetchProjectStats(projectName) {
  return apiRequest(`project_stats/${projectName}`);
}

/**
 * Checks API health
 * @returns {Promise<Object>} Health status
 */
export async function checkApiHealth() {
  return apiRequest('health');
}