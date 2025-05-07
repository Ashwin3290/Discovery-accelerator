from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import shutil
from fastapi.responses import JSONResponse
import uvicorn
from pathlib import Path

from file_processing import ProjectDataPipeline
from discovery_accelerator import DiscoveryAccelerator
from discovery_db import DiscoveryDatabase
from dotenv import load_dotenv
load_dotenv()

# Pydantic models for request/response validation
class DirectoryProcessRequest(BaseModel):
    directory_path: str = Field(..., description="Path to the directory to process")
    project_name: Optional[str] = Field(None, description="Optional custom project name")
    user_id: Optional[int] = Field(1, description="User ID for the project")

class QueryRequest(BaseModel):
    project_name: str = Field(..., description="Name of the project to query")
    query: str = Field(..., description="Query text")
    n_results: int = Field(default=5, description="Number of results to return")

class QueryResult(BaseModel):
    source: str
    type: str
    similarity: float
    content: Optional[str] = None
    image_available: Optional[bool] = None
    text: str

class QueryResponse(BaseModel):
    status: str
    results: List[QueryResult]

class ProjectStats(BaseModel):
    total_documents: int
    text_documents: int
    image_documents: int

class ProjectStatsResponse(BaseModel):
    status: str
    project_name: str
    stats: ProjectStats

class ProjectsResponse(BaseModel):
    status: str
    projects: List[str]

class HealthResponse(BaseModel):
    status: str
    upload_folder: str
    chroma_path: str

# New models for Discovery Accelerator
class ProcessDocumentsRequest(BaseModel):
    project_name: str = Field(..., description="Name of the project")
    sow_path: str = Field(..., description="Path to the SOW document")
    additional_docs_paths: Optional[List[str]] = Field(None, description="Paths to additional documents")

class GenerateQuestionsRequest(BaseModel):
    project_id: int = Field(..., description="ID of the project")
    sow_data: Dict[str, Any] = Field(..., description="SOW data from document processing")

class GenerateQuestionsByIdRequest(BaseModel):
    project_id: int = Field(..., description="ID of the project")

class StartDiscoveryRequest(BaseModel):
    project_name: str = Field(..., description="Name of the project")
    sow_path: str = Field(..., description="Path to the SOW document")
    additional_docs_paths: Optional[List[str]] = Field(None, description="Paths to additional documents")

class ProcessTranscriptRequest(BaseModel):
    project_id: int = Field(..., description="ID of the project")
    transcript_text: str = Field(..., description="Text of the meeting transcript")

# FastAPI app
app = FastAPI(
    title="Discovery Accelerator API",
    description="API for processing SOW documents, generating discovery questions, and analyzing meeting transcripts",
    version="1.0.0"
)

# Configuration
UPLOAD_FOLDER = './uploads'
CHROMA_PATH = './chroma_db'
INFERENCE_API_URL = "http://localhost:5000"  # Default local inference API URL
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize the pipeline
pipeline = ProjectDataPipeline(
    base_dir=UPLOAD_FOLDER,
    inference_api_url=INFERENCE_API_URL,
    chroma_path=CHROMA_PATH
)

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to be safe for filesystem operations"""
    return "".join(c for c in filename if c.isalnum() or c in ('-', '_')).rstrip()

@app.post("/process_directory", response_model=ProjectStatsResponse)
async def process_directory(request: DirectoryProcessRequest):
    """
    Process a directory containing documents and images.
    
    The directory will be copied to a secure location and processed.
    All supported files (PDF, PPT, DOCX, images) will be analyzed and indexed.
    """
    try:
        if not os.path.exists(request.directory_path):
            raise HTTPException(status_code=404, detail="Directory does not exist")
        print(f"Processing directory: {request.directory_path}")
        # Use provided project name or directory name
        project_name = request.project_name or os.path.basename(request.directory_path)
        project_name = sanitize_filename(project_name)
        
        # Create project directory in uploads
        project_dir = os.path.join(UPLOAD_FOLDER, project_name)
        print(project_dir)
        os.makedirs(project_dir, exist_ok=True)
        
        # Copy contents to upload directory
        for item in os.listdir(request.directory_path):
            s = os.path.join(request.directory_path, item)
            d = os.path.join(project_dir, item)
            if os.path.isfile(s):
                shutil.copy2(s, d)
            elif os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
        
        # Process the project
        pipeline.process_project(project_name, project_dir)
        
        # Get project stats
        stats = pipeline.get_project_stats(project_name)
        summary = pipeline.summarize_existing_chroma(project_name)
        
        return {
            'status': 'success',
            'project_name': project_name,
            'stats': stats,
            'synopsis': summary
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query_project", response_model=QueryResponse)
async def query_project(request: QueryRequest):
    """
    Query a processed project with text.
    
    Returns the most relevant documents and images matching the query,
    sorted by similarity score.
    """
    try:
        results = pipeline.query_project(
            request.project_name,
            request.query,
            request.n_results
        )
        
        # Format results for response
        formatted_results = []
        for result in results:
            formatted_result = QueryResult(
                source=result['source'],
                type=result['type'],
                similarity=1 - result['distance'],
                content=result.get('content') if result['type'] == 'text' else None,
                image_available=result.get('image') is not None if result['type'] == 'image' else None,
                text=result.get("Text")
            )
            formatted_results.append(formatted_result)
        
        return {
            'status': 'success',
            'results': formatted_results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/list_projects", response_model=ProjectsResponse)
async def list_projects():
    """
    List all available projects in the system.
    """
    try:
        print("API: Calling list_projects method...")
        projects = pipeline.list_projects()
        print(f"API: Received {len(projects)} projects: {projects}")
        
        # Validate and sanitize project names
        project_names = []
        
        # Handle case where projects is None
        if projects is None:
            print("API: Warning - received None instead of project list")
            return {
                'status': 'success',
                'projects': []
            }
        
        # Process each project to ensure we have valid strings
        for i, project in enumerate(projects):
            try:
                # Skip empty or None values
                if project is None or (isinstance(project, str) and not project.strip()):
                    print(f"API: Skipping empty project at index {i}")
                    continue
                    
                # Handle different types of project objects
                if isinstance(project, str):
                    project_names.append(project)
                else:
                    # For non-string objects, try various methods to get name
                    if hasattr(project, 'name'):
                        project_names.append(project.name)
                    else:
                        # Convert to string and add a note for debugging
                        print(f"API: Converting unknown project type to string: {type(project)}")
                        project_str = str(project)
                        # Ensure we don't add extremely long strings
                        if len(project_str) > 100:
                            project_str = project_str[:100] + "..."
                        project_names.append(project_str)
            except Exception as project_error:
                print(f"API: Error processing project {i}: {str(project_error)}")
                # Skip problematic projects instead of failing completely
                continue
        
        print(f"API: Returning {len(project_names)} valid project names")
        return {
            'status': 'success',
            'projects': project_names
        }
    
    except Exception as e:
        print(f"Error listing projects: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return an empty list instead of raising an exception
        return {
            'status': 'warning',
            'projects': [],
            'error': str(e)
        }

@app.get("/project_stats/{project_name}", response_model=ProjectStatsResponse)
async def project_stats(project_name: str):
    """
    Get statistics for a specific project.
    
    Returns counts of total documents, text documents, and image documents.
    """
    try:
        stats = pipeline.get_project_stats(project_name)
        if not stats:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {
            'status': 'success',
            'project_name': project_name,
            'stats': stats
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns the status of the API and current configuration.
    """
    return {
        'status': 'healthy',
        'upload_folder': UPLOAD_FOLDER,
        'chroma_path': CHROMA_PATH
    }

# New endpoints for Discovery Accelerator

@app.post("/process_documents")
async def process_documents(request: ProcessDocumentsRequest):
    """
    Process documents without generating questions.
    
    Parses the SOW document and processes additional documents.
    Creates embeddings and analyzes document content.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Process documents
        print("Document processing starting...")
        result = accelerator.process_documents(
            project_name=request.project_name,
            sow_path=request.sow_path,
            additional_docs_paths=request.additional_docs_paths
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_questions")
async def generate_questions(request: GenerateQuestionsRequest):
    """
    Generate questions from previously processed SOW data.
    
    This endpoint can be used if question generation failed in a previous attempt
    without needing to reprocess documents.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Generate questions
        print("Question generation starting...")
        result = accelerator.generate_questions(
            project_id=request.project_id,
            sow_data=request.sow_data
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/start_discovery")
async def start_discovery(request: StartDiscoveryRequest):
    """
    Combined endpoint that processes documents and generates questions.
    
    This is a compatibility endpoint that maintains the previous behavior.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Start combined discovery process
        print("Combined discovery process starting...")
        result = accelerator.start_discovery(
            project_name=request.project_name,
            sow_path=request.sow_path,
            additional_docs_paths=request.additional_docs_paths
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_transcript")
async def process_transcript(request: ProcessTranscriptRequest):
    """
    Process a meeting transcript to extract answers and generate follow-up questions.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Process transcript
        result = accelerator.process_meeting_transcript(
            project_id=request.project_id,
            transcript_text=request.transcript_text
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_questions/{project_id}")
async def get_questions(project_id: int, status: Optional[str] = None):
    """
    Get current questions for a project, optionally filtered by status.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Get questions
        questions = accelerator.get_current_questions(
            project_id=project_id,
            status=status
        )
        
        return {
            'status': 'success',
            'questions': questions
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/discovery_status/{project_id}")
async def discovery_status(project_id: int):
    """
    Check if the discovery process is complete.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Get discovery status
        status = accelerator.is_discovery_complete(project_id)
        
        return {
            'status': 'success',
            'discovery_status': status
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_questions_by_id")
async def generate_questions_by_id(request: GenerateQuestionsByIdRequest):
    """
    Generate questions using only the project ID.
    
    This endpoint retrieves the SOW data first and then generates questions.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Get SOW data first
        sow_data = accelerator.db.get_project_sow_data(request.project_id)
        
        if not sow_data:
            return {
                'status': 'error',
                'message': 'SOW data not found for this project'
            }
        
        # Generate questions
        print("Question generation starting...")
        result = accelerator.generate_questions(
            project_id=request.project_id,
            sow_data=sow_data
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_sow_data/{project_id}")
async def get_sow_data(project_id: int):
    """
    Get SOW data for a specific project.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Get SOW data
        sow_data = accelerator.db.get_project_sow_data(project_id)
        
        if not sow_data:
            return {
                'status': 'error',
                'message': 'SOW data not found for this project'
            }
        
        return {
            'status': 'success',
            'project_id': project_id,
            'sow_data': sow_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/discovery_report/{project_id}")
async def discovery_report(project_id: int):
    """
    Generate a comprehensive report of the discovery process.
    """
    try:
        # Initialize discovery accelerator
        accelerator = DiscoveryAccelerator(
            base_dir=UPLOAD_FOLDER,
            chroma_path=CHROMA_PATH,
            gemini_api_key=GEMINI_API_KEY,
            inference_api_url=INFERENCE_API_URL
        )
        
        # Generate report
        report = accelerator.generate_discovery_report(project_id)
        
        return report
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# CLI configuration for running the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "project_api:app",
        host="0.0.0.0",
        port=4000
        )
