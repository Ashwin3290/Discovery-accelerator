// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Makes a request to the API
 * @param {string} endpoint - The API endpoint
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {Object} data - Data to send in the request body
 * @param {FormData} formData - Form data to send (for file uploads)
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} The API response
 */
async function apiRequest(endpoint, method = 'GET', data = null, formData = null, options = {}) {
  const url = `${API_URL}/${endpoint}`;
  
  const requestOptions = {
    method: method.toUpperCase(),
    headers: {},
    ...options
  };

  if (data && !formData) {
    requestOptions.headers['Content-Type'] = 'application/json';
    requestOptions.body = JSON.stringify(data);
  }

  if (formData) {
    requestOptions.body = formData;
    // No Content-Type header for FormData, browser will set it with boundary
  }

  try {
    console.log(`API Request: ${method.toUpperCase()} ${url}`);
    if (formData) {
      console.log('Request type: FormData upload');
      // Log FormData contents for debugging
      let entryCount = 0;
      for (let [key, value] of formData.entries()) {
        entryCount++;
        if (value instanceof File) {
          console.log(`FormData entry ${entryCount}: ${key} = File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`FormData entry ${entryCount}: ${key} = ${value}`);
        }
      }
    } else if (data) {
      console.log('Request body:', data);
    }

    const response = await fetch(url, requestOptions);
    
    console.log(`Response status: ${response.status}`);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || `API Error: ${response.status}`;
      } catch {
        errorMessage = `API Error: ${response.status} - ${errorText || response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('API Success Response:', result);
    return result;
    
  } catch (error) {
    console.error('API request failed:', error);
    
    // Enhance error message based on error type
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to API at ${url}. Please check if the server is running.`);
    }
    
    throw error;
  }
}

/**
 * Validates a file before upload
 * @param {File} file - The file to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
function validateFile(file) {
  if (!(file instanceof File)) {
    return { valid: false, error: 'Not a valid File object' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes)' };
  }

  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return { valid: false, error: `File too large (max ${maxSize / (1024 * 1024)}MB)` };
  }

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain' // For testing
  ];

  const allowedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    return { valid: false, error: `File type not supported. Allowed types: ${allowedExtensions.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Validates multiple files before upload
 * @param {File[]} files - Array of files to validate
 * @returns {Object} Validation result with details
 */
function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, error: 'No files provided' };
  }

  const errors = [];
  const validFiles = [];

  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (validation.valid) {
      validFiles.push(file);
    } else {
      errors.push(`File ${index + 1} (${file.name || 'unnamed'}): ${validation.error}`);
    }
  });

  return {
    valid: validFiles.length > 0,
    validFiles,
    errors,
    totalFiles: files.length,
    validCount: validFiles.length
  };
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
  // Validate SOW file
  const sowValidation = validateFile(sowFile);
  if (!sowValidation.valid) {
    throw new Error(`SOW file validation failed: ${sowValidation.error}`);
  }

  // Validate additional files
  if (additionalFiles.length > 0) {
    const filesValidation = validateFiles(additionalFiles);
    if (!filesValidation.valid) {
      throw new Error(`Additional files validation failed: ${filesValidation.errors.join(', ')}`);
    }
  }

  const formData = new FormData();
  formData.append('project_name', projectName);
  formData.append('sow_file', sowFile);
  
  if (additionalFiles.length > 0) {
    additionalFiles.forEach((file) => {
      formData.append('additional_docs', file);
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
  // Validate SOW file
  const sowValidation = validateFile(sowFile);
  if (!sowValidation.valid) {
    throw new Error(`SOW file validation failed: ${sowValidation.error}`);
  }

  // Validate additional files
  if (additionalFiles.length > 0) {
    const filesValidation = validateFiles(additionalFiles);
    if (!filesValidation.valid) {
      throw new Error(`Additional files validation failed: ${filesValidation.errors.join(', ')}`);
    }
  }

  const formData = new FormData();
  formData.append('project_name', projectName);
  formData.append('sow_file', sowFile);
  
  if (additionalFiles.length > 0) {
    additionalFiles.forEach((file) => {
      formData.append('additional_docs', file);
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
  if (!transcriptText || transcriptText.trim().length === 0) {
    throw new Error('Transcript text is required');
  }

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
    endpoint += `?status=${encodeURIComponent(status)}`;
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
  return apiRequest(`project_stats/${encodeURIComponent(projectName)}`);
}

/**
 * Checks API health
 * @returns {Promise<Object>} Health status
 */
export async function checkApiHealth() {
  return apiRequest('health');
}

// ==================== ADDITIONAL DOCUMENT PROCESSING APIs ====================

/**
 * Uploads and processes additional documents for an existing project
 * @param {number} projectId - The project ID
 * @param {File[]} documents - Array of document files to process
 * @returns {Promise<Object>} Processing results
 */
export async function uploadAdditionalDocuments(projectId, documents) {
  console.log('=== ENHANCED API UPLOAD DEBUG START ===');
  console.log('Project ID:', projectId);
  console.log('Documents to upload:', documents);
  
  // Validate project ID
  if (!projectId || isNaN(projectId)) {
    throw new Error('Valid project ID is required');
  }

  // Validate documents array
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error('At least one document is required');
  }

  // Validate all files
  const filesValidation = validateFiles(documents);
  if (!filesValidation.valid) {
    throw new Error(`File validation failed: ${filesValidation.errors.join(', ')}`);
  }

  console.log(`Validation passed: ${filesValidation.validCount}/${filesValidation.totalFiles} files valid`);
  
  // Log each valid document
  filesValidation.validFiles.forEach((file, index) => {
    console.log(`Valid document ${index + 1}:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
      instanceof_File: file instanceof File
    });
  });
  
  // Create FormData with validated files
  const formData = new FormData();
  
  filesValidation.validFiles.forEach((file, index) => {
    console.log(`Adding file ${index + 1} to FormData: ${file.name} (${file.size} bytes)`);
    formData.append('documents', file, file.name);
  });
  
  // Log FormData contents
  console.log('FormData contents:');
  let entryCount = 0;
  for (let [key, value] of formData.entries()) {
    entryCount++;
    if (value instanceof File) {
      console.log(`Entry ${entryCount}: ${key} = File(${value.name}, ${value.size} bytes, ${value.type})`);
    } else {
      console.log(`Entry ${entryCount}: ${key} = ${value}`);
    }
  }
  
  console.log(`Making API request to: upload_additional_documents/${projectId}`);
  console.log('=== ENHANCED API UPLOAD DEBUG END ===');
  
  try {
    const result = await apiRequest(`upload_additional_documents/${projectId}`, 'POST', null, formData);
    console.log('Upload successful:', result);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    
    // Enhance error message for common issues
    if (error.message.includes('413')) {
      throw new Error('Files too large. Please reduce file size or upload fewer files at once.');
    } else if (error.message.includes('400')) {
      throw new Error('Invalid file format or corrupted files. Please check your documents.');
    } else if (error.message.includes('404')) {
      throw new Error('Project not found. Please verify the project ID.');
    } else if (error.message.includes('500')) {
      throw new Error('Server error during file processing. Please try again or contact support.');
    }
    
    throw error;
  }
}

/**
 * Bulk processes multiple additional documents with optimized batch processing
 * @param {number} projectId - The project ID
 * @param {File[]} documents - Array of document files to process
 * @returns {Promise<Object>} Bulk processing results
 */
export async function bulkProcessAdditionalDocuments(projectId, documents) {
  console.log('=== BULK PROCESS API DEBUG START ===');
  console.log('Project ID:', projectId);
  console.log('Documents for bulk processing:', documents.length);
  
  // Validate inputs
  if (!projectId || isNaN(projectId)) {
    throw new Error('Valid project ID is required');
  }

  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error('At least one document is required for bulk processing');
  }

  // Recommend bulk processing for 4+ files
  if (documents.length < 4) {
    console.warn('Bulk processing is recommended for 4+ files. Consider using regular upload for better performance.');
  }

  // Validate all files
  const filesValidation = validateFiles(documents);
  if (!filesValidation.valid) {
    throw new Error(`File validation failed: ${filesValidation.errors.join(', ')}`);
  }

  console.log(`Bulk validation passed: ${filesValidation.validCount}/${filesValidation.totalFiles} files valid`);
  
  const formData = new FormData();
  formData.append('project_id', projectId.toString());
  
  filesValidation.validFiles.forEach((file, index) => {
    console.log(`Adding bulk file ${index + 1}: ${file.name} (${file.size} bytes)`);
    formData.append('documents', file, file.name);
  });
  
  console.log('Making bulk API request...');
  console.log('=== BULK PROCESS API DEBUG END ===');
  
  try {
    const result = await apiRequest('bulk_process_additional_documents', 'POST', null, formData);
    console.log('Bulk processing successful:', result);
    return result;
  } catch (error) {
    console.error('Bulk processing failed:', error);
    throw new Error(`Bulk processing failed: ${error.message}`);
  }
}

/**
 * Gets comprehensive project progress including additional document impact
 * @param {number} projectId - The project ID
 * @returns {Promise<Object>} Comprehensive progress summary
 */
export async function fetchProjectProgress(projectId) {
  if (!projectId || isNaN(projectId)) {
    throw new Error('Valid project ID is required');
  }
  
  return apiRequest(`project_progress/${projectId}`);
}

/**
 * Gets answers grouped by source (documents vs transcripts)
 * @param {number} projectId - The project ID
 * @returns {Promise<Object>} Answers grouped by source
 */
export async function fetchAnswersBySource(projectId) {
  if (!projectId || isNaN(projectId)) {
    throw new Error('Valid project ID is required');
  }
  
  return apiRequest(`answers_by_source/${projectId}`);
}

/**
 * Gets unanswered questions for a project
 * @param {number} projectId - The project ID
 * @returns {Promise<Object>} Unanswered questions list
 */
export async function fetchUnansweredQuestions(projectId) {
  if (!projectId || isNaN(projectId)) {
    throw new Error('Valid project ID is required');
  }
  
  return apiRequest(`unanswered_questions/${projectId}`);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type icon emoji
 * @param {string} filename - The filename
 * @returns {string} Icon emoji
 */
export function getFileIcon(filename) {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📈';
    case 'txt':
      return '📄';
    default:
      return '📄';
  }
}

/**
 * Check if file type is supported
 * @param {File} file - The file to check
 * @returns {boolean} Whether the file type is supported
 */
export function isFileTypeSupported(file) {
  const validation = validateFile(file);
  return validation.valid;
}

// Export validation functions for external use
export { validateFile, validateFiles };