// fileUtils.js
/**
 * Reads a text file
 * @param {File} file - The file to read
 * @returns {Promise<string>} The file content as text
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        resolve(reader.result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Converts a File object to a base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded file content
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error converting file to base64'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Gets file extension from filename
 * @param {string} filename - The filename
 * @returns {string} The file extension
 */
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

/**
 * Checks if a file is a document (PDF, DOCX)
 * @param {File} file - The file to check
 * @returns {boolean} True if the file is a document
 */
export function isDocument(file) {
  const ext = getFileExtension(file.name);
  return ['pdf', 'docx'].includes(ext);
}

/**
 * Checks if a file is an image
 * @param {File} file - The file to check
 * @returns {boolean} True if the file is an image
 */
export function isImage(file) {
  const ext = getFileExtension(file.name);
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext);
}

/**
 * Creates a file download link
 * @param {Blob} blob - The file blob
 * @param {string} filename - The filename
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Formats file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}