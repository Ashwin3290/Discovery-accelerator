import os
import sqlite3
from typing import List, Dict, Any, Optional, Tuple
import json
import datetime
import shutil
import time
import traceback

from sow_parser import SOWParser
from question_generator import QuestionGenerator
from transcript_analyzer import TranscriptAnalyzer
from discovery_db import DiscoveryDatabase
from file_processing import ProjectDataPipeline

class DiscoveryAccelerator:
    def __init__(self, base_dir: str, chroma_path: str = None, db_path: str = 'discovery.db', gemini_api_key: str = None, inference_api_url: str = "http://localhost:5000"):
        """Initialize the Discovery Accelerator with necessary components"""
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)
        
        # Set API key for Gemini
        self.gemini_api_key = gemini_api_key
        
        # Initialize database
        self.db = DiscoveryDatabase(db_path)
        
        # Initialize document processing pipeline
        self.pipeline = ProjectDataPipeline(
            base_dir=base_dir,
            inference_api_url=inference_api_url,
            chroma_path=chroma_path
        )
        
        # Initialize other components
        self.sow_parser = SOWParser(gemini_api_key=gemini_api_key)
        self.question_generator = QuestionGenerator(self.db, chroma_path=chroma_path,gemini_api_key=gemini_api_key)
        self.transcript_analyzer = TranscriptAnalyzer(self.db, gemini_api_key=gemini_api_key)

    def process_documents(self, project_name: str, sow_path: str, additional_docs_paths: List[str] = None) -> Dict[str, Any]:
        print(f"\n========================================\nSTARTING DOCUMENT PROCESSING FOR: {project_name}\nTIMESTAMP: {time.strftime('%Y-%m-%d %H:%M:%S')}\n========================================")
        """
        Process documents and extract SOW data without generating questions
        
        Args:
            project_name: Name of the project
            sow_path: Path to the SOW document
            additional_docs_paths: Paths to additional documents
            
        Returns:
            Dictionary with project ID, session ID, and SOW data
        """
        try:
            # Create project
            print(f"Step 1: Creating project in database...")
            project_id = self.db.create_project(project_name, sow_path)
            print(f"Project created with ID: {project_id}")
            
            # Parse SOW document
            print(f"Step 2: Parsing SOW document at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            try:
                sow_data = self.sow_parser.parse_sow(sow_path)
                print(f"SOW parsing completed successfully")
                print(f"Found {len(sow_data.get('requirements', []))} requirements and {len(sow_data.get('sections', {}))} sections")
                print(f"Storing SOW data in database...")
                self.db.store_sow_data(project_id, sow_data)
                print(f"SOW data stored successfully")
            except Exception as sow_error:
                print(f"ERROR: SOW parsing failed: {str(sow_error)}")
                traceback.print_exc()
                raise
            
            # Process documents for vector search
            print(f"Step 3: Preparing documents for processing at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            doc_paths = []
            if additional_docs_paths:
                print(f"Adding {len(additional_docs_paths)} additional documents to process")
                doc_paths.extend(additional_docs_paths)
            print(f"Total documents to process: {len(doc_paths)}")
            
            # Create project directory
            print(f"Step 4: Creating project directory...")
            project_dir = os.path.join(self.base_dir, project_name)
            os.makedirs(project_dir, exist_ok=True)
            print(f"Project directory created at: {project_dir}")
            
            # Copy and process documents
            print(f"Step 5: Copying documents to project directory...")
            for i, doc_path in enumerate(doc_paths):
                try:
                    if os.path.exists(doc_path):
                        filename = os.path.basename(doc_path)
                        dest_path = os.path.join(project_dir, filename)
                        print(f"Copying document {i+1}/{len(doc_paths)}: {filename}")
                        
                        # Simple file copy
                        with open(doc_path, 'rb') as src_file:
                            with open(dest_path, 'wb') as dst_file:
                                dst_file.write(src_file.read())
                        print(f"Document copied successfully")
                    else:
                        print(f"WARNING: Document not found: {doc_path}")
                except Exception as copy_error:
                    print(f"ERROR: Failed to copy document {doc_path}: {str(copy_error)}")
                    traceback.print_exc()
            
            # NEW: Process documents and collect requirement matches
            print(f"\nStep 6: Processing documents to create embeddings and match requirements at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            processed_results = self.pipeline.process_project(project_name, project_dir, sow_data)
            
            # NEW: Merge requirement matches from all documents
            all_requirement_matches = {}
            if processed_results and 'document_requirement_matches' in processed_results:
                doc_req_matches = processed_results['document_requirement_matches']
                for req_id, matches in doc_req_matches.items():
                    if req_id not in all_requirement_matches:
                        all_requirement_matches[req_id] = []
                    all_requirement_matches[req_id].extend(matches)
            
            # NEW: Add requirement matches to SOW data
            sow_data['requirement_matches'] = all_requirement_matches
            print(f"Found supporting content for {len(all_requirement_matches)} requirements")
            
            # Update SOW data in database with requirement matches
            self.db.store_sow_data(project_id, sow_data)
            print(f"Updated SOW data with requirement matches")
            
            print(f"Document processing completed successfully at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return {
                'status': 'success',
                'project_id': project_id,
                'project_name': project_name,
                'sow_data': sow_data
            }

        except Exception as e:
            print(f"\n========================================\nDOCUMENT PROCESSING FAILED at {time.strftime('%Y-%m-%d %H:%M:%S')}\n========================================")
            print(f"ERROR: {str(e)}")
            traceback.print_exc()
            return {
                'status': 'error',
                'message': str(e)
            }

    def generate_questions(self, project_id: int, sow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate questions from SOW data as a separate step from document processing
        
        Args:
            project_id: ID of the project
            sow_data: The SOW data dictionary from process_documents
            
        Returns:
            Dictionary with questions and status
        """
        print(f"\n========================================\nSTARTING QUESTION GENERATION FOR PROJECT ID: {project_id}\nTIMESTAMP: {time.strftime('%Y-%m-%d %H:%M:%S')}\n========================================")
        
        try:
            # Get project info
            conn = self.db._get_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            project = cursor.fetchone()
            conn.close()
            
            if not project:
                return {
                    'status': 'error',
                    'message': f'Project with ID {project_id} not found'
                }
                
            project_name = project['name']
            print(f"Generating questions for project: {project_name}")
            
            # Generate initial questions
            print(f"Generating initial questions at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            try:
                initial_questions = self.question_generator.generate_initial_questions(sow_data,project_name)
                print(f"Question generation completed with {len(initial_questions)} questions")
                
                print(f"Storing questions in database...")
                with open("questions.json", 'w') as file:
                    json.dump(initial_questions, file, indent=4)
                print(f"Questions stored in questions.json")
                question_ids = self.db.store_questions(initial_questions["questions"], project_id)
                print(f"Stored {len(question_ids)} questions in database")
            except Exception as question_error:
                print(f"ERROR: Question generation failed: {str(question_error)}")
                traceback.print_exc()
                # Return with error but include project ID so user can try again
                return {
                    'status': 'error',
                    'message': f"Failed to generate questions: {str(question_error)}",
                    'project_id': project_id,
                    'project_name': project_name
                }
            
            print(f"\n========================================\nQUESTION GENERATION COMPLETED SUCCESSFULLY at {time.strftime('%Y-%m-%d %H:%M:%S')}\n========================================\n")
            
            return {
                'status': 'success',
                'project_id': project_id,
                'project_name': project_name,
                'initial_questions_count': len(question_ids),
                'questions': initial_questions
            }
            
        except Exception as e:
            print(f"\n========================================\nQUESTION GENERATION FAILED at {time.strftime('%Y-%m-%d %H:%M:%S')}\n========================================")
            print(f"ERROR: {str(e)}")
            traceback.print_exc()
            return {
                'status': 'error',
                'message': str(e),
                'project_id': project_id
            }
    
    def start_discovery(self, project_name: str, sow_path: str, additional_docs_paths: List[str] = None) -> Dict[str, Any]:
        """
        Compatibility method that combines process_documents and generate_questions
        
        Args:
            project_name: Name of the project
            sow_path: Path to the SOW document
            additional_docs_paths: Paths to additional documents
            
        Returns:
            Dictionary with project ID and initial questions
        """
        print(f"\n========================================\nSTARTING COMBINED DISCOVERY PROCESS FOR: {project_name}\nTIMESTAMP: {time.strftime('%Y-%m-%d %H:%M:%S')}\n========================================")
        
        # First process documents
        doc_result = self.process_documents(project_name, sow_path, additional_docs_paths)
        
        if doc_result['status'] != 'success':
            return doc_result
        
        # Then generate questions
        with open("SOW.txt", 'r') as file:
            sow_file = file.read()
        question_result = self.generate_questions(
            project_id=doc_result['project_id'],
            sow_data=doc_result['sow_data'],
        )
        
        return question_result
    
    def process_meeting_transcript(self, project_id: int, transcript_text: str) -> Dict[str, Any]:
        """
        Process a meeting transcript to extract answers and generate follow-up questions
        
        Args:
            project_id: ID of the project
            transcript_text: Text of the meeting transcript
            
        Returns:
            Dictionary with processing results and follow-up questions
        """
        try:
            # Process transcript to extract answers
            transcript_results = self.transcript_analyzer.process_transcript(project_id, transcript_text)
            
            # Generate follow-up questions based on answers
            followup_questions = []
            
            if transcript_results.get('status') == 'success':
                # Get questions that were answered in this transcript
                conn = self.db._get_connection()
                cursor = conn.cursor()
                
                cursor.execute(
                    """
                    SELECT q.id, q.question, a.answer_text
                    FROM questions q 
                    JOIN answers a ON q.id = a.question_id
                    WHERE a.transcript_id = ?
                    """,
                    (transcript_results.get('transcript_id'),)
                )
                
                answered_questions = cursor.fetchall()
                conn.close()
                
                # Generate follow-up questions for each answered question
                for q_id, question, answer in answered_questions:
                    q_followups = self.question_generator.generate_followup_questions(q_id, answer)
                    followup_questions.extend(q_followups)
                
                # Store follow-up questions in database
                if followup_questions:
                    self.db.store_questions(followup_questions, project_id)
            
            # Get discovery status
            discovery_status = self.db.get_discovery_status(project_id)
            
            return {
                'status': 'success',
                'transcript_processed': transcript_results.get('status') == 'success',
                'answers_found': transcript_results.get('answers_found', 0),
                'followup_questions_count': len(followup_questions),
                'followup_questions': followup_questions,
                'discovery_status': discovery_status
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_current_questions(self, project_id: int, status: str = None) -> List[Dict[str, Any]]:
        """
        Get current questions for a project, optionally filtered by status
        
        Args:
            project_id: ID of the project
            status: Optional status filter ('unanswered', 'answered', 'partially_answered')
            
        Returns:
            List of questions with their details
        """
        conn = self.db._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if status:
            cursor.execute(
                "SELECT * FROM questions WHERE project_id = ? AND status = ? ORDER BY priority, id",
                (project_id, status)
            )
        else:
            cursor.execute(
                "SELECT * FROM questions WHERE project_id = ? ORDER BY status, priority, id",
                (project_id,)
            )
        
        questions = [{key: row[key] for key in row.keys()} for row in cursor.fetchall()]
        
        # Get answers for answered questions
        for q in questions:
            if q['status'] in ['answered', 'partially_answered']:
                cursor.execute(
                    """
                    SELECT a.*, t.meeting_date
                    FROM answers a 
                    JOIN transcripts t ON a.transcript_id = t.id
                    WHERE a.question_id = ?
                    ORDER BY a.id DESC LIMIT 1
                    """,
                    (q['id'],)
                )
                
                answer = cursor.fetchone()
                if answer:
                    q['answer'] = {key: answer[key] for key in answer.keys()}
        
        conn.close()
        return questions
    
    def is_discovery_complete(self, project_id: int) -> Dict[str, Any]:
        """
        Check if the discovery process is complete
        
        Args:
            project_id: ID of the project
            
        Returns:
            Dictionary with completion status and metrics
        """
        return self.db.get_discovery_status(project_id)
    
    def generate_discovery_report(self, project_id: int) -> Dict[str, Any]:
        """
        Generate a comprehensive report of the discovery process
        
        Args:
            project_id: ID of the project
            
        Returns:
            Dictionary with report data
        """
        try:
            # Get project info
            conn = self.db._get_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            project = cursor.fetchone()
            
            if not project:
                return {
                    'status': 'error',
                    'message': 'Project not found'
                }
            
            # Get SOW data
            sow_data = self.db.get_project_sow_data(project_id)
            
            # Get questions and answers
            all_questions = self.get_current_questions(project_id)
            
            # Group questions by status
            questions_by_status = {}
            for q in all_questions:
                status = q['status']
                if status not in questions_by_status:
                    questions_by_status[status] = []
                questions_by_status[status].append(q)
            
            # Get transcripts
            cursor.execute(
                "SELECT * FROM transcripts WHERE project_id = ? ORDER BY meeting_date",
                (project_id,)
            )
            transcripts = [{key: row[key] for key in row.keys()} for row in cursor.fetchall()]
            
            # Get new information
            cursor.execute(
                "SELECT * FROM new_information WHERE project_id = ? ORDER BY priority",
                (project_id,)
            )
            new_info = [{key: row[key] for key in row.keys()} for row in cursor.fetchall()]
            
            conn.close()
            
            # Compile report data
            discovery_status = self.db.get_discovery_status(project_id)
            
            return {
                'status': 'success',
                'project': {
                    'id': project['id'],
                    'name': project['name'],
                    'created_at': project['created_at']
                },
                'discovery_status': discovery_status,
                'sow_summary': {
                    'sections_count': len(sow_data.get('sections', {})),
                    'requirements_count': len(sow_data.get('requirements', [])),
                    'in_scope_items': len(sow_data.get('boundaries', {}).get('in_scope', [])),
                    'out_of_scope_items': len(sow_data.get('boundaries', {}).get('out_of_scope', [])),
                    'unclear_items': len(sow_data.get('boundaries', {}).get('unclear', []))
                },
                'questions': {
                    'total': len(all_questions),
                    'by_status': {
                        status: len(questions)
                        for status, questions in questions_by_status.items()
                    },
                    'details': questions_by_status
                },
                'transcripts': {
                    'count': len(transcripts),
                    'details': transcripts
                },
                'new_information': new_info
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
