import os
import google.generativeai as genai
from typing import List, Dict, Any, Optional
import json
import re
import time
import traceback

class QuestionGenerator:
    def __init__(self, db_connection, gemini_api_key=None):
        # Set API key for Gemini
        if gemini_api_key:
            os.environ["GOOGLE_API_KEY"] = gemini_api_key
            genai.configure(api_key=gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.db = db_connection
        
    def generate_initial_questions(self, sow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        print(f"\n==== STARTING QUESTION GENERATION at {time.strftime('%Y-%m-%d %H:%M:%S')} ====")
        print(f"SOW data contains {len(sow_data.get('requirements', []))} requirements and {len(sow_data.get('boundaries', {}).get('unclear', []))} unclear boundaries")
        """
        Generate initial questions based on SOW analysis
        
        Args:
            sow_data: Dictionary containing SOW sections, requirements, and boundaries
            
        Returns:
            List of question dictionaries
        """
        questions = []
        
        # Generate questions for ambiguous requirements
        ambiguous_reqs = [req for req in sow_data['requirements'] 
                         if req.get('clarity') == 'ambiguous']
        
        print(f"Found {len(ambiguous_reqs)} ambiguous requirements to generate questions for")
        
        req_count = 0
        for req in ambiguous_reqs:
            req_count += 1
            print(f"\nProcessing ambiguous requirement {req_count}/{len(ambiguous_reqs)}: {req.get('id', 'Unknown')}")
            prompt = f"""
            Based on this ambiguous requirement from a Statement of Work:
            
            ID: {req.get('id', 'Unknown')}
            Text: {req.get('text', 'Not provided')}
            Section: {req.get('section', 'Not provided')}
            Reason for ambiguity: {req.get('reason', 'Not specified')}
            
            Generate 1-3 specific, clear questions that would help clarify this requirement.
            Each question should address a specific aspect of the ambiguity.
            
            Format your response as a JSON array of objects with keys:
            - question: The specific question text
            - context: Brief explanation of why this question needs to be asked
            - priority: A value from 1-3 (1 being highest priority)
            """
            
            print(f"Sending prompt to Gemini API at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            try:
                response = self.model.generate_content(prompt)
                print(f"Received response from Gemini API at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            except Exception as api_error:
                print(f"ERROR: Gemini API call failed: {str(api_error)}")
                traceback.print_exc()
                # Continue with empty boundary questions
                boundary_questions = []
                print("Skipping boundary questions due to API error")
                print(f"Received response from Gemini API at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            except Exception as api_error:
                print(f"ERROR: Gemini API call failed: {str(api_error)}")
                traceback.print_exc()
                continue  # Skip this requirement if API call fails
            print("Parsing questions from Gemini response...")
            req_questions = self._parse_questions_from_response(response.text)
            print(f"Extracted {len(req_questions)} questions from response")
            
            for q in req_questions:
                q['source'] = f"Requirement: {req.get('id', 'Unknown')}"
                q['source_text'] = req.get('text', '')
                q['status'] = "unanswered"
                
            questions.extend(req_questions)
        
        # Generate questions for unclear boundaries
        if sow_data['boundaries'].get('unclear'):
            print(f"\n==== Processing unclear boundaries at {time.strftime('%Y-%m-%d %H:%M:%S')} ====")
            unclear_items = sow_data['boundaries']['unclear']
            
            prompt = f"""
            The following items in a Statement of Work have unclear boundaries or scope:
            
            {json.dumps(unclear_items, indent=2)}
            
            For each unclear item, generate 1-2 specific questions that would help clarify the scope.
            
            Format your response as a JSON array of objects with keys:
            - item: The unclear item being addressed
            - question: The specific question text
            - context: Brief explanation of why this question needs to be asked
            - priority: A value from 1-3 (1 being highest priority)
            """
            
            response = self.model.generate_content(prompt)
            print("Parsing boundary questions from Gemini response...")
            boundary_questions = self._parse_questions_from_response(response.text)
            print(f"Extracted {len(boundary_questions)} boundary questions from response")
            
            for q in boundary_questions:
                q['source'] = "Unclear Boundary"
                q['source_text'] = q.get('item', 'Boundary item')
                q['status'] = "unanswered"
                
            questions.extend(boundary_questions)
        
        # Store questions in database
        print(f"\n==== Generated a total of {len(questions)} questions ====")
        if questions and hasattr(self.db, 'store_questions'):
            print(f"Storing {len(questions)} questions in database at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            try:
                self.db.store_questions(questions)
                print("Questions successfully stored in database")
            except Exception as db_error:
                print(f"ERROR: Failed to store questions in database: {str(db_error)}")
                traceback.print_exc()
        else:
            print("WARNING: No questions to store or database storage not available")
        
        print(f"==== COMPLETED QUESTION GENERATION at {time.strftime('%Y-%m-%d %H:%M:%S')} ====\n")
        
        return questions
    
    def generate_followup_questions(self, question_id: int, answer: str) -> List[Dict[str, Any]]:
        """
        Generate follow-up questions based on an answer
        
        Args:
            question_id: ID of the answered question
            answer: The answer provided
            
        Returns:
            List of follow-up question dictionaries
        """
        # Get the original question
        original_question = self.db.get_question(question_id)
        if not original_question:
            return []
        
        prompt = f"""
        Original Question: {original_question.get('question', '')}
        Context: {original_question.get('context', '')}
        Source: {original_question.get('source', '')}
        Source Text: {original_question.get('source_text', '')}
        
        Answer Received: {answer}
        
        Analyze if this answer fully addresses the original question. If not, or if it raises new questions:
        1. Determine if any aspects of the original question remain unclear
        2. Identify if the answer introduces new information that needs clarification
        3. Generate follow-up questions if needed
        
        Format your response as a JSON object with these keys:
        - fully_answered: Boolean indicating if the original question is fully answered
        - reason: Brief explanation for your determination
        - followup_questions: Array of follow-up questions, each with:
          * question: The specific question text
          * context: Why this follow-up is needed
          * priority: A value from 1-3 (1 being highest priority)
        """
        
        response = self.model.generate_content(prompt)
        
        try:
            # Extract JSON from response
            json_pattern = r'```json\n([\s\S]*?)\n```'
            json_match = re.search(json_pattern, response.text)
            
            if json_match:
                result = json.loads(json_match.group(1))
            else:
                # Try direct JSON parsing
                try:
                    result = json.loads(response.text)
                except:
                    # Fall back to simple parsing
                    result = {
                        'fully_answered': 'fully answered' in response.text.lower(),
                        'reason': 'Could not parse structured response',
                        'followup_questions': []
                    }
            
            # Update original question status
            if result.get('fully_answered', False):
                self.db.update_question_status(question_id, "answered")
            else:
                self.db.update_question_status(question_id, "partially_answered")
            
            # Process follow-up questions
            followup_questions = result.get('followup_questions', [])
            for q in followup_questions:
                q['parent_question_id'] = question_id
                q['source'] = original_question.get('source', '')
                q['source_text'] = original_question.get('source_text', '')
                q['status'] = "unanswered"
            
            # Store follow-up questions
            if followup_questions and hasattr(self.db, 'store_questions'):
                self.db.store_questions(followup_questions)
            
            return followup_questions
            
        except Exception as e:
            print(f"Error generating follow-up questions: {str(e)}")
            return []
    
    def _parse_questions_from_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse questions from Gemini response text"""
        print("Parsing response from Gemini...")
        if response_text:
            print(f"Response length: {len(response_text)} characters")
            print(f"Response preview: {response_text[:100]}...")
        else:
            print("WARNING: Empty response received from Gemini")
            return []
        """Parse questions from Gemini response text"""
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
                    # Fall back to simple parsing
                    lines = response_text.split('\n')
                    current_question = {}
                    
                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue
                        
                        if line.startswith('Question:') or line.startswith('- Question:'):
                            # Save previous question if it exists
                            if current_question and 'question' in current_question:
                                questions.append(current_question)
                            
                            # Start a new question
                            current_question = {'question': line.split(':', 1)[1].strip()}
                        elif ':' in line and current_question:
                            key, value = line.split(':', 1)
                            key = key.strip().lower()
                            if key in ['context', 'priority', 'item']:
                                current_question[key] = value.strip()
                    
                    # Add the last question
                    if current_question and 'question' in current_question:
                        questions.append(current_question)
        
        except Exception as e:
            print(f"Error parsing questions from response: {str(e)}")
        
        return questions