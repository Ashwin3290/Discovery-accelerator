# Discovery Accelerator Troubleshooting Guide

This document provides solutions for common issues with the Discovery Accelerator system.

## Common Issues and Solutions

### 1. Questions Not Being Generated

**Symptoms:**
- SOW file is processed but no questions are generated
- The system doesn't move from processing the SOW to generating questions

**Solutions:**
1. **Check Gemini API Key:**
   ```bash
   # Verify the API key is properly set
   echo $GOOGLE_API_KEY
   # If not set, set it correctly:
   export GOOGLE_API_KEY=your_api_key_here
   ```

2. **Run Component Tests:**
   ```bash
   python test_components.py /path/to/your/sow.pdf
   ```
   This will test each component individually and identify which one is failing.

3. **Verify SOW Format:**
   - Ensure the SOW document has clear sections and requirements
   - The system works best with structured documents that have clear headings and sections

### 2. Embeddings Not Being Created

**Symptoms:**
- Files are processed but no embeddings are created
- ChromaDB is empty after processing

**Solutions:**
1. **Check Inference Server:**
   - Make sure the model_inference.py server is running
   - Open a browser and navigate to http://localhost:5000/ to check status

2. **Test Text Embedding:**
   ```bash
   curl -X POST http://localhost:5000/embed_text \
      -H "Content-Type: application/json" \
      -d '{"text":"Test embedding"}'
   ```
   Verify you get a valid embedding response

3. **Fix Connection URL:**
   - Edit file_processing.py to ensure it uses the correct inference API URL
   - The URL should be "http://localhost:5000" or the URL shown when starting the server

4. **Use Local Embeddings:**
   - The system now falls back to local embeddings if the server is unavailable
   - This ensures the system will work even if the inference server fails

### 3. File Processing Issues

**Symptoms:**
- Errors when processing certain file types
- Missing content in processed files

**Solutions:**
1. **Check File Paths:**
   - Use absolute paths when possible
   - Verify file permissions

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Check File Format Support:**
   - PDF: Make sure PDFs are not password-protected or corrupted
   - DOCX: Ensure Word documents can be opened normally
   - Images: Verify images are in supported formats (JPG, PNG)

### 4. Database Issues

**Symptoms:**
- Errors related to database operations
- Missing questions or answers

**Solutions:**
1. **Reset Database:**
   ```bash
   # Remove the database file and let the system recreate it
   rm discovery.db
   ```

2. **Check Database Permissions:**
   ```bash
   # Ensure the directory is writeable
   chmod 755 .
   ```

3. **Verify Database Operations:**
   - Use the database directly to test operations:
   ```python
   from discovery_db import DiscoveryDatabase
   db = DiscoveryDatabase()
   # Test database operations
   ```

## Step-by-Step Troubleshooting Process

If you're experiencing issues with the Discovery Accelerator, follow these steps:

1. **Check Environment:**
   - Verify the Python environment is properly set up
   - Confirm all dependencies are installed
   - Ensure the Gemini API key is correctly set

2. **Test Components:**
   - Run the test_components.py script to diagnose specific issues
   - Pay attention to error messages and component failures

3. **Check Logs:**
   - Look for error messages in the terminal output
   - Check for exceptions and stack traces

4. **Restart Services:**
   - Restart the inference server (model_inference.py)
   - Restart the API server (project_api.py)
   - Restart the Streamlit interface (streamlit_app.py)

5. **Clear Temporary Files:**
   - Remove any temporary files or directories
   - Clear the ChromaDB directory and let the system rebuild it

## Advanced Debugging

For more advanced troubleshooting, you can:

1. **Enable Debug Mode:**
   - Edit the API server to enable debug mode:
   ```python
   # In project_api.py
   DEBUG = True
   ```

2. **Add Detailed Logging:**
   - Add more print statements to track execution flow
   - Use the logging module for structured logs:
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

3. **Check Network Connections:**
   - Verify that all services can communicate with each other
   - Check firewall settings if running on different machines

## Getting Help

If you continue to experience issues:

1. Run the test_components.py script and share the output
2. Note the specific step where the process fails
3. Capture any error messages or exceptions
4. Provide details about your environment (OS, Python version, etc.)

With this information, we can help diagnose and fix the specific issue with your Discovery Accelerator setup.
