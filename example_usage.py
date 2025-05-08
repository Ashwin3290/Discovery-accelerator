import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the agentic version of Discovery Accelerator
from adk import AgenticDiscoveryAccelerator

def main():
    # Initialize the agentic discovery accelerator
    print("Initializing Agentic Discovery Accelerator...")
    
    # Use environment variables for API keys
    gemini_api_key = os.environ.get("GOOGLE_API_KEY")
    
    # Initialize with the same parameters as the original DiscoveryAccelerator
    accelerator = AgenticDiscoveryAccelerator(
        base_dir=".",
        db_path="discovery.db",
        gemini_api_key=gemini_api_key
    )
    
    # Example: Process a SOW document
    project_name = "Example Project"
    sow_path = "./data/example_sow.pdf"  # Replace with an actual path
    
    if os.path.exists(sow_path):
        print(f"Processing SOW document: {sow_path}")
        
        # Process documents and generate questions
        result = accelerator.start_discovery(project_name, sow_path)
        
        if result['status'] == 'success':
            print(f"Successfully processed SOW with ID: {result['project_id']}")
            print(f"Generated {result['initial_questions_count']} questions")
            
            # Print the first few questions as an example
            print("\nSample Questions:")
            for i, question in enumerate(result['questions'][:3]):
                print(f"{i+1}. {question['question']}")
                print(f"   Priority: {question['priority']}")
                print(f"   Context: {question['context']}")
                if 'alignment' in question:
                    print(f"   Alignment: {question['alignment']}")
                print()
            
            # Example: Process a transcript
            project_id = result['project_id']
            transcript_text = """
            Meeting Transcript - Project Kickoff
            
            Stakeholder 1: Let's discuss the timeline for this project.
            Stakeholder 2: I think we can complete it in 3 months.
            Stakeholder 1: Are we using the existing infrastructure or building new?
            Stakeholder 2: We'll need to build some new components, but we can leverage the existing database.
            Stakeholder 1: What about the user authentication system?
            Stakeholder 2: We'll use OAuth 2.0 with multi-factor authentication.
            """
            
            print("Processing example transcript...")
            transcript_result = accelerator.process_meeting_transcript(project_id, transcript_text)
            
            if transcript_result['status'] == 'success':
                print(f"Found {transcript_result['answers_found']} answers in transcript")
                print(f"Generated {transcript_result['followup_questions_count']} follow-up questions")
                
                # Print the follow-up questions as an example
                if transcript_result['followup_questions_count'] > 0:
                    print("\nSample Follow-up Questions:")
                    for i, question in enumerate(transcript_result['followup_questions'][:3]):
                        print(f"{i+1}. {question['question']}")
                        print(f"   Priority: {question['priority']}")
                        print(f"   Context: {question['context']}")
                        if 'alignment' in question:
                            print(f"   Alignment: {question['alignment']}")
                        print()
            else:
                print(f"Error processing transcript: {transcript_result.get('message', 'Unknown error')}")
        else:
            print(f"Error processing SOW: {result.get('message', 'Unknown error')}")
    else:
        print(f"SOW file not found: {sow_path}")
        print("Please provide a valid SOW file path")

if __name__ == "__main__":
    main()
