# Fix for additional_document_processor.py - Use existing file processing methods

import os
import json
import time
import traceback
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from file_processing import ProjectDataPipeline, convert_to_pdf, extract_text_with_gemini, match_requirements_to_document

class AdditionalDocumentProcessor:
    def __init__(self, db_connection, gemini_api_key=None, chroma_path=None):
        """Initialize the Additional Document Processor"""
        # Set API key for Gemini
        if gemini_api_key:
            os.environ["GOOGLE_API_KEY"] = gemini_api_key
            genai.configure(api_key=gemini_api_key)
        elif "GOOGLE_API_KEY" in os.environ:
            genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
        else:
            raise ValueError("No Gemini API key provided")
            
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.db = db_connection
        self.gemini_api_key = gemini_api_key
        self.chroma_path = chroma_path
        
        # Initialize the file processing pipeline to reuse existing methods
        self.pipeline = ProjectDataPipeline(
            base_dir="./temp_processing",
            inference_api_url="http://localhost:5000",
            chroma_path=chroma_path,
            gemini_api_key=gemini_api_key
        )
        
    def process_additional_documents(self, project_id: int, document_paths: List[str]) -> Dict[str, Any]:
        """
        Process additional documents after project initialization
        
        Args:
            project_id: ID of the existing project
            document_paths: List of paths to additional documents
            
        Returns:
            Dictionary with processing results
        """
        print(f"\n==== PROCESSING ADDITIONAL DOCUMENTS FOR PROJECT {project_id} ====")
        print(f"Documents to process: {len(document_paths)}")
        
        try:
            # Get project info and existing data
            project_info = self._get_project_info(project_id)
            if not project_info:
                return {
                    'status': 'error',
                    'message': f'Project with ID {project_id} not found'
                }
            
            # Get SOW data for context
            sow_data = self.db.get_project_sow_data(project_id)
            if not sow_data:
                return {
                    'status': 'error',
                    'message': 'No SOW data found for this project'
                }
            
            # Get existing unanswered questions
            existing_questions = self.db.get_unanswered_questions(project_id)
            print(f"Found {len(existing_questions)} existing unanswered questions")
            
            # Process each document using existing file processing methods
            processed_docs = []
            all_answers = []
            all_new_questions = []
            
            for doc_path in document_paths:
                print(f"\nProcessing document: {os.path.basename(doc_path)}")
                
                try:
                    # Use the existing parse_file method from the pipeline
                    doc_result = self.pipeline.parse_file(doc_path, sow_data)
                    
                    if not doc_result or 'extracted_content' not in doc_result:
                        print(f"Failed to extract content from {doc_path}")
                        continue
                    
                    doc_content = doc_result['extracted_content']
                    requirement_matches = doc_result.get('requirement_matches', {})
                    
                    print(f"Successfully extracted content from {os.path.basename(doc_path)}")
                    
                    # Try to answer existing questions with this document
                    answers = self._extract_answers_from_document(
                        doc_content, existing_questions, doc_path
                    )
                    all_answers.extend(answers)
                    
                    # Generate new questions based on document content
                    new_questions = self._generate_questions_from_document(
                        project_id, doc_content, sow_data, existing_questions, doc_path
                    )
                    all_new_questions.extend(new_questions)
                    
                    processed_docs.append({
                        'document_path': doc_path,
                        'content_extracted': True,
                        'answers_found': len(answers),
                        'new_questions_generated': len(new_questions),
                        'requirement_matches': len(requirement_matches)
                    })
                    
                    print(f"Document {os.path.basename(doc_path)}: {len(answers)} answers, {len(new_questions)} questions")
                    
                except Exception as doc_error:
                    print(f"Error processing document {doc_path}: {str(doc_error)}")
                    traceback.print_exc()
                    processed_docs.append({
                        'document_path': doc_path,
                        'content_extracted': False,
                        'error': str(doc_error),
                        'answers_found': 0,
                        'new_questions_generated': 0,
                        'requirement_matches': 0
                    })
                    continue
            
            # Store answers in database
            answer_count = 0
            for answer in all_answers:
                try:
                    # Create a document record for the answer source
                    doc_id = self._store_document_reference(
                        project_id, answer['source_document']
                    )
                    
                    # Store the answer
                    stored = self.db.store_answer(
                        question_id=answer['question_id'],
                        transcript_id=doc_id,  # Using doc_id as reference
                        answer_text=answer['answer'],
                        confidence=answer['confidence']
                    )
                    if stored:
                        answer_count += 1
                        # Update question status
                        self.db.update_question_status(
                            answer['question_id'], 
                            'answered' if answer['confidence'] > 0.8 else 'partially_answered'
                        )
                except Exception as e:
                    print(f"Error storing answer: {str(e)}")
            
            # Store new questions
            new_question_count = 0
            if all_new_questions:
                question_ids = self.db.store_questions(all_new_questions, project_id)
                new_question_count = len(question_ids)
            
            print(f"\n==== COMPLETED PROCESSING ADDITIONAL DOCUMENTS ====")
            print(f"Documents processed: {len(processed_docs)}")
            print(f"Answers found: {answer_count}")
            print(f"New questions generated: {new_question_count}")
            
            return {
                'status': 'success',
                'project_id': project_id,
                'documents_processed': len([d for d in processed_docs if d.get('content_extracted', False)]),
                'answers_found': answer_count,
                'new_questions_generated': new_question_count,
                'processed_documents': processed_docs
            }
            
        except Exception as e:
            print(f"ERROR processing additional documents: {str(e)}")
            traceback.print_exc()
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _get_project_info(self, project_id: int) -> Optional[Dict]:
        """Get project information from database"""
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            project = cursor.fetchone()
            conn.close()
            
            if project:
                return {key: project[key] for key in project.keys()}
            return None
        except Exception as e:
            print(f"Error getting project info: {str(e)}")
            return None
    
    def _extract_answers_from_document(
        self, doc_content: str, questions: List[Dict], source_doc: str
    ) -> List[Dict]:
        """Extract answers to existing questions from document content"""
        if not questions:
            return []
        
        answers = []
        
        # Process questions in batches to avoid token limits
        batch_size = 5
        for i in range(0, len(questions), batch_size):
            batch_questions = questions[i:i+batch_size]
            
            # Create question list for prompt
            questions_text = ""
            for idx, q in enumerate(batch_questions):
                questions_text += f"{idx+1}. {q['question']}\n"
                if q.get('context'):
                    questions_text += f"   Context: {q['context']}\n"
                questions_text += "\n"
            
            prompt = f"""
            You are analyzing a document to find answers to specific project discovery questions.
            
            QUESTIONS TO ANSWER:
            {questions_text}
            
            DOCUMENT CONTENT:
            {doc_content}  # Limit content to avoid token limits
            
            For each question, determine if there is a relevant answer in the document content.
            Look for both direct answers and indirect information that addresses the question.
            
            Format your response as a JSON array of objects with these keys:
            - question_index: The number of the question (1-based)
            - answer_found: Boolean indicating if an answer was found
            - answer: The extracted answer text (if found)
            - confidence: A value from 0.0 to 1.0 indicating confidence in the answer
            - explanation: Brief explanation of why this answers the question
            - document_section: Which part of the document contains the answer
            
            Only extract answers that directly or clearly address the questions. 
            Be conservative - if you're not confident, mark confidence as low.
            """
            
            try:
                response = self.model.generate_content(prompt)
                batch_answers = self._parse_answers_from_response(response.text)
                
                # Map back to original question IDs
                for answer in batch_answers:
                    if answer.get('answer_found', False):
                        q_idx = answer.get('question_index', 0) - 1
                        if 0 <= q_idx < len(batch_questions):
                            answers.append({
                                'question_id': batch_questions[q_idx].get('id'),
                                'answer': answer.get('answer', ''),
                                'confidence': answer.get('confidence', 0.0),
                                'explanation': answer.get('explanation', ''),
                                'source_document': source_doc,
                                'document_section': answer.get('document_section', '')
                            })
                            
            except Exception as e:
                print(f"Error extracting answers from document batch: {str(e)}")
                continue
        
        return answers
    
    def _generate_questions_from_document(
        self, project_id: int, doc_content: str, sow_data: Dict, 
        existing_questions: List[Dict], source_doc: str
    ) -> List[Dict]:
        """Generate new questions based on document content"""
        try:
            # Create summary of existing questions to avoid duplicates
            existing_q_text = "\n".join([
                f"- {q['question']}" for q in existing_questions[:20]  # Limit to avoid token overflow
            ])
            
            # Create summary of SOW requirements
            requirements_text = ""
            if sow_data.get('requirements'):
                for req in sow_data['requirements'][:10]:  # Limit requirements
                    requirements_text += f"- {req.get('id', '')}: {req.get('text', '')}\n"
            
            prompt = f"""
            You are a technical analyst reviewing a new document that has been added to an ongoing project.
            Generate specific, technical questions that arise from this document content that haven't been covered by existing questions.
            
            PROJECT REQUIREMENTS CONTEXT:
            {requirements_text}
            
            EXISTING QUESTIONS (avoid duplicating these):
            {existing_q_text}
            
            NEW DOCUMENT CONTENT:
            {doc_content[:20000]}  # Limit content
            
            Based on this new document, generate 3-7 specific questions that:
            1. Address technical details mentioned in the document
            2. Clarify implementation aspects revealed by the document
            3. Identify dependencies or constraints mentioned
            4. Explore integration points discussed
            5. Investigate any new requirements or scope items
            
            Focus on questions that:
            - Are technically specific and actionable
            - Address gaps or new information from this document
            - Would help with project implementation
            - Are NOT duplicates of existing questions
            
            Format your response as a JSON array of objects with keys:
            - question: The specific question text
            - context: Why this question is important based on the document
            - priority: A value from 1-3 (1 being highest priority)
            - category: Type of question (e.g., "Technical", "Integration", "Requirements")
            - target_stakeholder: Who should answer (e.g., "Technical Lead", "Business Analyst")
            - document_reference: Brief reference to relevant part of document
            """
            
            response = self.model.generate_content(prompt)
            questions = self._parse_questions_from_response(response.text)
            
            # Add metadata to questions
            for q in questions:
                q['source'] = f"Additional Document: {os.path.basename(source_doc)}"
                q['source_text'] = f"Generated from document analysis"
                q['status'] = 'unanswered'
                q['additional_document'] = source_doc
                q['source_type'] = 'document'
                
            return questions
            
        except Exception as e:
            print(f"Error generating questions from document: {str(e)}")
            return []
    
    def _store_document_reference(self, project_id: int, doc_path: str) -> int:
        """Store document reference for answer tracking"""
        try:
            # Use the transcript table to store document references for now
            doc_id = self.db.store_transcript(
                project_id, 
                f"Additional Document: {os.path.basename(doc_path)}"
            )
            return doc_id
        except Exception as e:
            print(f"Error storing document reference: {str(e)}")
            return 0
    
    def _parse_answers_from_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse answers from Gemini response text"""
        import re
        import json
        
        answers = []
        
        try:
            # Try to extract JSON from the response
            json_pattern = r'```json\n([\s\S]*?)\n```'
            json_match = re.search(json_pattern, response_text)
            
            if json_match:
                answers = json.loads(json_match.group(1))
            else:
                # Try direct JSON parsing
                try:
                    answers = json.loads(response_text)
                except:
                    print("Failed to parse JSON, using fallback parsing")
                    answers = []
                    
        except Exception as e:
            print(f"Error parsing answers from response: {str(e)}")
        
        return answers
    
    def _parse_questions_from_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse questions from Gemini response text"""
        import re
        import json
        
        questions = []
        
        try:
            # Try to extract JSON from the response
            json_pattern = r'```json\n([\s\S]*?)\n```'
            json_match = re.search(json_pattern, response_text)
            
            if json_match:
                questions = json.loads(json_match.group(1))
            else:
                # Try direct JSON parsing
                try:
                    questions = json.loads(response_text)
                except:
                    print("Failed to parse JSON, using fallback parsing")
                    questions = []
                    
        except Exception as e:
            print(f"Error parsing questions from response: {str(e)}")
        
        return questions