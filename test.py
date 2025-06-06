from fastapi import FastAPI, UploadFile, HTTPException
from typing import List
import os
import shutil
from pathlib import Path

app = FastAPI(title="Multi File Upload API")

# Directory to store uploaded files
UPLOAD_DIRECTORY = "uploaded_files"

# Create upload directory if it doesn't exist
Path(UPLOAD_DIRECTORY).mkdir(parents=True, exist_ok=True)

@app.post("/upload-files/")
async def upload_files(files: List[UploadFile]):
    """
    Upload multiple files and save them to local directory with original names
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    uploaded_files = []
    failed_files = []
    
    for file in files:
        if file.filename == "":
            failed_files.append({"filename": "empty", "error": "No filename provided"})
            continue
            
        try:
            # Create the full file path
            file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files.append({
                "filename": file.filename,
                "size": file.size,
                "content_type": file.content_type,
                "path": file_path
            })
            
        except Exception as e:
            failed_files.append({
                "filename": file.filename,
                "error": str(e)
            })
        
        finally:
            # Close the file
            file.file.close()
    
    return {
        "message": f"Successfully uploaded {len(uploaded_files)} files",
        "uploaded_files": uploaded_files,
        "failed_files": failed_files,
        "total_files": len(files)
    }

@app.get("/")
async def root():
    """
    Root endpoint with basic information
    """
    return {
        "message": "Multi File Upload API",
        "upload_endpoint": "/upload-files/",
        "upload_directory": UPLOAD_DIRECTORY
    }

@app.get("/uploaded-files/")
async def list_uploaded_files():
    """
    List all files in the upload directory
    """
    try:
        files = []
        for filename in os.listdir(UPLOAD_DIRECTORY):
            file_path = os.path.join(UPLOAD_DIRECTORY, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "created": stat.st_ctime
                })
        
        return {
            "files": files,
            "total_count": len(files),
            "directory": UPLOAD_DIRECTORY
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)