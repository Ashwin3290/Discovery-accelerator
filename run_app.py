import subprocess
import sys
import os
import time
import webbrowser
import threading
from dotenv import load_dotenv
load_dotenv()

def run_inference_server():
    print("Starting Inference Server...")
    subprocess.Popen([sys.executable, "model_inference.py"], 
                   stdout=subprocess.PIPE,
                   stderr=subprocess.PIPE)
    # Give some time for the server to start
    time.sleep(5)

def run_api_server():
    print("Starting API Server...")
    subprocess.Popen([sys.executable, "project_api.py"], 
                   stdout=subprocess.PIPE,
                   stderr=subprocess.PIPE)
    # Give some time for the server to start
    time.sleep(5)

def run_streamlit():
    print("Starting Streamlit App...")
    subprocess.Popen([sys.executable, "-m", "streamlit", "run", "streamlit_app.py"], 
                   stdout=subprocess.PIPE,
                   stderr=subprocess.PIPE)
    # Give some time for the server to start
    time.sleep(5)

def open_browser():
    # Wait a moment to ensure Streamlit is ready
    time.sleep(8)
    print("Opening web browser...")
    webbrowser.open("http://localhost:8501")

if __name__ == "__main__":
    # Create directory for uploaded files
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("temp", exist_ok=True)
    
    # Check if GOOGLE_API_KEY is set
    if "GOOGLE_API_KEY" not in os.environ:
        print("WARNING: GOOGLE_API_KEY environment variable is not set.")
        print("Gemini API functionality will not work without an API key.")
        print("\nPlease set your API key with:")
        print("  Windows: set GOOGLE_API_KEY=your_api_key_here")
        print("  Linux/Mac: export GOOGLE_API_KEY=your_api_key_here")
        
        # Ask if user wants to continue anyway
        response = input("\nDo you want to continue without setting the API key? (y/n): ")
        if response.lower() != 'y':
            print("Exiting. Please set the API key and try again.")
            sys.exit(1)
    
    # Start all servers
    run_inference_server()
    run_api_server()
    run_streamlit()
    
    # Open browser in a separate thread
    threading.Thread(target=open_browser).start()
    
    print("\nDiscovery Accelerator is running!")
    print("Inference Server: http://localhost:5000")
    print("API Server: http://localhost:8000")
    print("Streamlit App: http://localhost:8501")
    print("\nPress Ctrl+C to stop all servers")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down all servers...")
        # We let the subprocesses terminate naturally when the main process ends
        print("Done.")
