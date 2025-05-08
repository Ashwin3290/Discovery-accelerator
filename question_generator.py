import os
import google.generativeai as genai
from typing import List, Dict, Any, Optional
import json
import re
import time
import traceback
import chromadb
import numpy as np
import requests
from collections import defaultdict

class QuestionGenerator:
    def __init__(self, db_connection, chroma_path:str, gemini_api_key=None):
        # Set API key for Gemini
        if gemini_api_key:
            os.environ["GOOGLE_API_KEY"] = gemini_api_key
            genai.configure(api_key=gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.db = db_connection
        self.chroma_client = chromadb.PersistentClient(
            path=chroma_path,
            settings=chromadb.Settings(
                allow_reset=True,
                is_persistent=True
            )
        )
        # Initialize logging
        self.logger = self._setup_logger()
    
    def _setup_logger(self):
        # Simple logger setup - can be enhanced with proper logging
        class SimpleLogger:
            def error(self, msg):
                print(f"ERROR: {msg}")
            def info(self, msg):
                print(f"INFO: {msg}")
            def debug(self, msg):
                print(f"DEBUG: {msg}")
        return SimpleLogger()
    
    def get_text_embedding(self, text: str) -> np.ndarray:
        """Get text embedding from the inference API"""
        try:
            print(f"Getting text embedding for text of length {len(text)}")
            
            # Try first with the API
            try:
                print(f"Calling inference API at {self.inference_api_url}/embed_text")
                response = requests.post(
                    f"{self.inference_api_url}/embed_text",
                    json={'text': text}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print("Successfully got embedding from API")
                    return np.array(result['embedding'])
                else:
                    print(f"API Error ({response.status_code}): {response.text}")
                    print("Falling back to local model")
            except Exception as api_e:
                print(f"Error calling API: {str(api_e)}")
                print("Falling back to local model")
            
            # Return a default embedding (this should be replaced with a proper fallback)
            return np.zeros((384,), dtype=np.float32)
            
        except Exception as e:
            self.logger.error(f"Error getting text embedding: {str(e)}")
            return np.zeros((384,), dtype=np.float32)

    def query_chroma(self, project_name: str, query_text: str, n_results: int = 10, filter_metadata: Dict = None) -> List[Dict]:
        """
        Query a project's ChromaDB collection and return relevant documents
        
        Args:
            project_name: Name of the project collection to query
            query_text: Text query to search for
            n_results: Maximum number of results to return
            filter_metadata: Optional metadata filter criteria (e.g., {"type": "text"})
            
        Returns:
            List of document dictionaries containing content and metadata
        """
        try:
            print(f"Querying project '{project_name}' with: '{query_text}'")
            
            # Get the collection
            collection = self.chroma_client.get_collection(name=project_name)
            
            # Generate embedding for the query text
            query_embedding = self.get_text_embedding(query_text).tolist()
            
            # Define query parameters
            query_params = {
                "query_embeddings": [query_embedding],
                "n_results": n_results,
                "include": ["documents", "metadatas", "distances", "embeddings"]
            }
            
            # Add filter if provided
            if filter_metadata:
                query_params["where"] = filter_metadata
            
            # Execute the query
            results = collection.query(**query_params)
            
            # No results check
            if not results or not results['ids'] or len(results['ids'][0]) == 0:
                print("No matching documents found")
                return []
            
            # Format results into a more usable structure
            formatted_results = []
            for i in range(len(results['ids'][0])):
                document = {
                    'id': results['ids'][0][i],
                    'content': results['documents'][0][i] if results['documents'] and i < len(results['documents'][0]) else None,
                    'metadata': results['metadatas'][0][i] if results['metadatas'] and i < len(results['metadatas'][0]) else {},
                    'similarity': 1.0 - float(results['distances'][0][i]) if results['distances'] else 0.0,
                    'source': results['metadatas'][0][i].get('source', 'unknown') if results['metadatas'] else 'unknown'
                }
                
                formatted_results.append(document)
            
            print(f"Found {len(formatted_results)} matching documents")
            return formatted_results
            
        except Exception as e:
            print(f"Error querying ChromaDB: {str(e)}")
            self.logger.error(f"Error querying ChromaDB for project {project_name}: {str(e)}")
            return []

    def _categorize_requirements(self, requirements: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Categorize requirements by clarity and ambiguity type
        
        Args:
            requirements: List of requirement dictionaries
            
        Returns:
            Dictionary with categorized requirements
        """
        categories = {
            "clear": [],
            "ambiguous": {
                "vague_language": [],
                "missing_criteria": [],
                "undefined_terms": [],
                "scope_issues": [],
                "format_missing": [],
                "other": []
            }
        }
        
        # Common patterns in ambiguity reasons
        ambiguity_patterns = {
            "vague_language": [
                "vague", "high-level", "lacks specific", "subjective", "unclear", 
                "lacks detail", "lack of precision", "not clear", "ambiguous"
            ],
            "missing_criteria": [
                "acceptance criteria", "success criteria", "no criteria", 
                "lacks metrics", "measurements", "how will", "what constitutes"
            ],
            "undefined_terms": [
                "not defined", "undefined", "not specified", "which documents", 
                "what is considered", "term is not", "which stakeholders"
            ],
            "scope_issues": [
                "scope", "boundary", "too broad", "too high level", "not sufficiently detailed",
                "what level of", "depth of"
            ],
            "format_missing": [
                "format", "documentation", "how to document", "level of detail"
            ]
        }
        
        # Categorize each requirement
        for req in requirements:
            # First separate clear vs ambiguous
            if req.get("clarity") == "clear":
                categories["clear"].append(req)
                continue
            
            # For ambiguous requirements, categorize by type
            reason = req.get("reason", "").lower()
            
            # Determine the ambiguity type
            ambiguity_type = "other"
            for category, patterns in ambiguity_patterns.items():
                if any(pattern in reason for pattern in patterns):
                    ambiguity_type = category
                    break
            
            # Add to appropriate category
            categories["ambiguous"][ambiguity_type].append(req)
        
        return categories
    
    def _prioritize_requirements(self, categorized_reqs: Dict) -> List[Dict]:
        """
        Prioritize requirements based on ambiguity type and section
        
        Args:
            categorized_reqs: Dictionary with categorized requirements
            
        Returns:
            List of prioritized requirements with priority field added
        """
        # Define priority order of sections
        high_priority_sections = [
            "Scope of Work", "Deliverables", "Acceptance Criteria"
        ]
        medium_priority_sections = [
            "Timeline/Schedule", "Assumptions/Constraints"
        ]
        
        # Define priority for ambiguity types
        ambiguity_priority = {
            "vague_language": 2,
            "missing_criteria": 1,  # Highest priority
            "undefined_terms": 2,
            "scope_issues": 1,
            "format_missing": 3,
            "other": 2
        }
        
        prioritized_reqs = []
        
        # Process each ambiguity type
        for ambiguity_type, reqs in categorized_reqs["ambiguous"].items():
            base_priority = ambiguity_priority.get(ambiguity_type, 2)
            
            for req in reqs:
                section = req.get("section", "")
                
                # Adjust priority based on section
                if section in high_priority_sections:
                    req["priority"] = min(base_priority, 2)  # 1 or 2
                elif section in medium_priority_sections:
                    req["priority"] = min(base_priority + 1, 3)  # 2 or 3
                else:
                    req["priority"] = min(base_priority + 1, 3)  # 2 or 3
                
                # Add to list
                prioritized_reqs.append(req)
        
        # Sort by priority
        return sorted(prioritized_reqs, key=lambda x: x.get("priority", 3))
    
    def _create_sow_context(self, sow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a comprehensive context from SOW data for better question generation"""
        context = {}
        
        # Extract project overview from relevant sections
        overview_sections = ['Introduction', 'Background', 'Overview', 'Executive Summary', 'Project Summary']
        overview_text = []
        for section_name, section_content in sow_data.get('sections', {}).items():
            if any(keyword.lower() in section_name.lower() for keyword in overview_sections):
                overview_text.append(section_content)
        
        context['overview'] = '\n'.join(overview_text) if overview_text else "Not available"
        
        # Extract deliverables
        deliverables_sections = ['Deliverables', 'Expected Outcomes', 'Results', 'Work Products']
        deliverables_text = []
        for section_name, section_content in sow_data.get('sections', {}).items():
            if any(keyword.lower() in section_name.lower() for keyword in deliverables_sections):
                deliverables_text.append(section_content)
        
        context['deliverables'] = '\n'.join(deliverables_text) if deliverables_text else "Not specified"
        
        # Extract stakeholders
        stakeholders_sections = ['Stakeholders', 'Team', 'Roles', 'Responsibilities', 'Organization']
        stakeholders_text = []
        for section_name, section_content in sow_data.get('sections', {}).items():
            if any(keyword.lower() in section_name.lower() for keyword in stakeholders_sections):
                stakeholders_text.append(section_content)
        
        context['stakeholders'] = '\n'.join(stakeholders_text) if stakeholders_text else "Not specified"
        
        # Determine project type
        context['project_type'] = self._classify_project_type(sow_data)
        
        return context
    
    def _classify_project_type(self, sow_data: Dict[str, Any]) -> str:
        """Classify the project type based on SOW data"""
        try:
            # Create a prompt for classification
            sections_text = []
            for section_name, section_content in sow_data.get('sections', {}).items():
                sections_text.append(f"## {section_name}\n{section_content}")
            
            combined_text = "\n\n".join(sections_text)
            
            # Look for key indicators in the SOW text
            lower_text = combined_text.lower()
            
            # Simple rule-based classification (can be enhanced with ML)
            if any(term in lower_text for term in ["software", "application", "system", "platform", "code", "development"]):
                return "software_development"
            elif any(term in lower_text for term in ["analysis", "assessment", "discovery", "flowmart modernization"]):
                return "consulting"
            elif any(term in lower_text for term in ["training", "knowledge transfer", "learning"]):
                return "training"
            elif any(term in lower_text for term in ["infrastructure", "hardware", "network", "server"]):
                return "infrastructure"
            
            # Default to consulting if no clear match
            return "consulting"
            
        except Exception as e:
            print(f"Error classifying project type: {str(e)}")
            return "consulting"
    
    def _find_related_requirements(self, req: Dict[str, Any], all_requirements: List[Dict[str, Any]], 
                                   max_related: int = 3) -> List[Dict[str, Any]]:
        """
        Find requirements related to the given requirement
        
        Args:
            req: The requirement to find related items for
            all_requirements: List of all requirements
            max_related: Maximum number of related requirements to return
            
        Returns:
            List of related requirements
        """
        related = []
        scoring = []
        
        # Skip if no requirement text
        if not req.get('text'):
            return related
            
        req_id = req.get('id', '')
        req_section = req.get('section', '')
        req_text = req.get('text', '').lower()
        req_words = set(req_text.split())
        
        # Score each requirement for relevance
        for other_req in all_requirements:
            other_id = other_req.get('id', '')
            
            # Skip the same requirement
            if other_id == req_id:
                continue
                
            other_section = other_req.get('section', '')
            other_text = other_req.get('text', '').lower()
            other_words = set(other_text.split())
            
            # Calculate score based on multiple factors
            score = 0
            
            # 1. Same section bonus
            if other_section == req_section:
                score += 50
                
            # 2. Clear requirement bonus (we want clear ones for context)
            if other_req.get('clarity') == 'clear':
                score += 25
                
            # 3. Word overlap score
            common_words = req_words.intersection(other_words)
            if len(req_words) > 0:
                overlap_ratio = len(common_words) / len(req_words)
                score += int(overlap_ratio * 100)
            
            # 4. Sequential ID bonus (likely related in document)
            if req_id and other_id:
                try:
                    req_num = int(req_id.split('-')[-1])
                    other_num = int(other_id.split('-')[-1])
                    if abs(req_num - other_num) <= 2:  # Adjacent or close requirements
                        score += 30
                except ValueError:
                    pass
            
            # Add to scoring list if score is positive
            if score > 0:
                scoring.append((score, other_req))
        
        # Sort by score descending and take top max_related
        scoring.sort(reverse=True, key=lambda x: x[0])
        related = [item[1] for item in scoring[:max_related]]
        
        return related

    def generate_initial_questions(self, sow_data: Dict[str, Any], project_name: str) -> Dict[str, Any]:
        """
        Generate initial questions based on SOW analysis with enhanced context and categorization
        
        Args:
            sow_data: Dictionary containing SOW sections, requirements, and boundaries
            project_name: Name of the project for ChromaDB search
            
        Returns:
            Dictionary with generated questions and requirement analysis
        """
        print(f"\n==== STARTING QUESTION GENERATION at {time.strftime('%Y-%m-%d %H:%M:%S')} ====")
        
        # Extract requirements from SOW data
        requirements = sow_data.get('requirements', [])
        print(f"SOW data contains {len(requirements)} requirements and {len(sow_data.get('boundaries', {}).get('unclear', []))} unclear boundaries")
        
        # Create result structure
        result = {
            "clear_requirements": [],
            "ambiguous_requirements": [],
            "questions": [],
            "summary": {
                "total_requirements": len(requirements),
                "clear_count": 0,
                "ambiguous_count": 0,
                "questions_count": 0,
                "categories": {}
            }
        }
        
        # 1. Categorize requirements by clarity and ambiguity type
        categorized_reqs = self._categorize_requirements(requirements)
        
        # 2. Store clear requirements
        result["clear_requirements"] = categorized_reqs["clear"]
        result["summary"]["clear_count"] = len(categorized_reqs["clear"])
        
        # 3. Prioritize ambiguous requirements
        prioritized_reqs = self._prioritize_requirements(categorized_reqs)
        result["ambiguous_requirements"] = prioritized_reqs
        result["summary"]["ambiguous_count"] = len(prioritized_reqs)
        
        # 4. Count by ambiguity category
        category_counts = {category: len(reqs) for category, reqs in categorized_reqs["ambiguous"].items()}
        result["summary"]["categories"] = category_counts
        
        # 5. Create SOW context
        sow_context = self._create_sow_context(sow_data)
        
        # 6. Generate questions for prioritized ambiguous requirements
        questions = []
        
        req_count = 0
        for req in prioritized_reqs:
            req_count += 1
            print(f"\nProcessing ambiguous requirement {req_count}/{len(prioritized_reqs)}: {req.get('id', 'Unknown')}")
            
            # Get related requirements for context
            related_reqs = self._find_related_requirements(req, requirements)
            related_reqs_text = ""
            if related_reqs:
                related_reqs_text = "Related requirements:\n" + "\n".join([f"- {r.get('id', 'Unknown')}: {r.get('text', '')}" for r in related_reqs])
            
            # Get additional context from ChromaDB if available
            chroma_context = ""
            # Get ambiguity category for better question targeting
            ambiguity_category = "unknown"
            for category, reqs in categorized_reqs["ambiguous"].items():
                if req in reqs:
                    ambiguity_category = category
                    break
            
            # Enhanced prompt based on ambiguity category
            # We'll customize the prompt focus based on the type of ambiguity
            ambiguity_focus = ""
            if ambiguity_category == "vague_language":
                ambiguity_focus = """
                Focus on questions that help:
                1. Define specific, measurable criteria for vague terms
                2. Establish clear boundaries and scope
                3. Clarify expected outcomes and deliverables
                """
            elif ambiguity_category == "missing_criteria":
                ambiguity_focus = """
                Focus on questions that help:
                1. Establish measurable acceptance criteria
                2. Define what "good" looks like
                3. Identify evaluation methods and metrics
                4. Clarify who approves and using what criteria
                """
            elif ambiguity_category == "undefined_terms":
                ambiguity_focus = """
                Focus on questions that help:
                1. Get precise definitions for domain-specific terminology
                2. Identify specific items (documents, stakeholders, systems)
                3. Establish common understanding of key terms
                """
            elif ambiguity_category == "scope_issues":
                ambiguity_focus = """
                Focus on questions that help:
                1. Define clear boundaries of what's in vs. out of scope
                2. Establish the required level of detail or depth
                3. Determine specific deliverables and their format
                4. Identify specific inclusions and exclusions
                """
            elif ambiguity_category == "format_missing":
                ambiguity_focus = """
                Focus on questions that help:
                1. Establish required format and documentation standards
                2. Determine level of detail required in deliverables
                3. Clarify expectations for diagrams, models, or other artifacts
                4. Identify specific audiences and their needs
                """
            else:
                ambiguity_focus = """
                Focus on questions that help:
                1. Clarify specific expectations and requirements
                2. Establish measurable criteria for success
                3. Define boundaries and scope
                4. Identify key stakeholders and their needs
                """
            
            # Create comprehensive prompt
            prompt = f"""
            Act as if you are a Technical Ananlyst with business context who can understand client requirements and work as mentioned with Technical Team for that you need to work upon clarifying and approcahing to the depths of the project and enquire about much more specific questions about the project in detail to reach the solution as per requirement.
            
            Project Overview:
            {sow_context.get('overview', 'Not available')}
            
            Project Type: {sow_context.get('project_type', 'General')}
            
            Key Stakeholders:
            {sow_context.get('stakeholders', 'Not specified')}
            
            Key Deliverables:
            {sow_context.get('deliverables', 'Not specified')}
            
            Based on this requirement from the Statement of Work for the project:
            
            ID: {req.get('id', 'Unknown')}
            Text: {req.get('text', 'Not provided')}
            Section: {req.get('section', 'Not provided')}
            Reason for ambiguity: {req.get('reason', 'Not specified')}
            Ambiguity type: {ambiguity_category}
            
            {related_reqs_text}
            
            {chroma_context}
            
            {ambiguity_focus}
            
            Generate specific, and technically specificfocused questions that would help clarify this requirement.
            Target your questions at the right stakeholders and consider:
            1. Deliverable expectations (what exactly needs to be created)
            2. Acceptance criteria (how will we know it's done correctly)
            3. Scope boundaries (what's included and excluded)
            4. Technical constraints (limitations or standards to follow)
            5. Timeline and priority (when is this needed and how important is it)
            6. Understand the business process and ask the questions accordingly
            7. Understand the technical process and ask the questions accordingly for making the solution according to requirements
            8. Identify potential risks and ask questions to mitigate them
            
            Format your response as a JSON array of objects with keys:
            - question: The specific question text
            - context: Brief explanation of why this question needs to be asked
            - priority: A value from 1-3 (1 being highest priority)
            """
            
            print(f"Sending enhanced prompt to Gemini API at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            try:
                response = self.model.generate_content(prompt)
                print(f"Received response from Gemini API at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            except Exception as api_error:
                print(f"ERROR: Gemini API call failed: {str(api_error)}")
                traceback.print_exc()
                continue  # Skip this requirement if API call fails
            
            print("Parsing questions from Gemini response...")
            req_questions = self._parse_questions_from_response(response.text)
            print(f"Extracted {len(req_questions)} questions from response")
            
            for q in req_questions:
                # Add metadata to each question
                q['source'] = f"Requirement: {req.get('id', 'Unknown')}"
                q['source_text'] = req.get('text', '')
                q['status'] = "unanswered"
                q['requirement_id'] = req.get('id', 'Unknown')
                q['section'] = req.get('section', '')
                q['ambiguity_reason'] = req.get('reason', '')
                 
            questions.extend(req_questions)
        
        # 7. Generate questions for unclear boundaries
        if sow_data.get('boundaries', {}).get('unclear'):
            print(f"\n==== Processing unclear boundaries at {time.strftime('%Y-%m-%d %H:%M:%S')} ====")
            unclear_items = sow_data.get('boundaries', {}).get('unclear', [])
            
            prompt = f"""
            You are an expert discovery analyst helping a professional services team understand project boundaries.
            
            Project Overview:
            {sow_context.get('overview', 'Not available')}
            
            Project Type: {sow_context.get('project_type', 'General')}
            
            The following items in the Statement of Work have unclear boundaries or scope:
            
            {json.dumps(unclear_items, indent=2)}
            
            Known In-Scope Items:
            {json.dumps(sow_data.get('boundaries', {}).get('in_scope', []), indent=2)}
            
            Known Out-of-Scope Items:
            {json.dumps(sow_data.get('boundaries', {}).get('out_of_scope', []), indent=2)}
            
            For each unclear item, generate 2-3 specific questions that would help clarify the scope.
            Your questions should:
            1. Be specific and actionable
            2. Help establish clear boundaries
            3. Uncover hidden assumptions
            4. Identify potential scope creep risks
            5. Determine ownership and responsibility
            
            Format your response as a JSON array of objects with keys:
            - item: The unclear item being addressed
            - question: The specific question text
            - context: Brief explanation of why this question needs to be asked
            - priority: A value from 1-3 (1 being highest priority)
            - risk_level: Risk level if left unclear (high, medium, low)
            - target_stakeholder: Who is the best person to ask (e.g., "Product Owner", "Technical Lead", "End User")
            """
            
            try:
                response = self.model.generate_content(prompt)
                print("Parsing boundary questions from Gemini response...")
                boundary_questions = self._parse_questions_from_response(response.text)
                print(f"Extracted {len(boundary_questions)} boundary questions from response")
                
                for q in boundary_questions:
                    q['source'] = "Unclear Boundary"
                    q['source_text'] = q.get('item', 'Boundary item')
                    q['status'] = "unanswered"
                    q['boundary_item'] = q.get('item', '')
                    
                questions.extend(boundary_questions)
            except Exception as boundary_error:
                print(f"ERROR: Boundary question generation failed: {str(boundary_error)}")
                traceback.print_exc()
        
        # 8. Add industry-specific questions
        industry_questions = self._generate_industry_specific_questions(sow_context.get('project_type', 'General'), sow_data)
        if industry_questions:
            questions.extend(industry_questions)
            print(f"Added {len(industry_questions)} industry-specific questions")
        
        # 9. Store questions and update result
        result["questions"] = questions
        result["summary"]["questions_count"] = len(questions)
        
        # 10. Store questions in database if available
        if questions and hasattr(self.db, 'store_questions'):
            print(f"Storing {len(questions)} questions in database at {time.strftime('%Y-%m-%d %H:%M:%S')}...")
            try:
                self.db.store_questions(questions)
                print("Questions successfully stored in database")
            except Exception as db_error:
                print(f"ERROR: Failed to store questions in database: {str(db_error)}")
                traceback.print_exc()
        
        print(f"==== COMPLETED QUESTION GENERATION at {time.strftime('%Y-%m-%d %H:%M:%S')} ====\n")
        
        return result
    
    def _generate_industry_specific_questions(self, project_type: str, sow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate industry-specific questions based on project type"""
        try:
            # Define industry-specific prompt templates based on project type
            industry_prompts = {
                'software_development': """
                As a software development expert, review this SOW and generate 3-5 critical questions
                that are often missed in software modernization projects but can cause significant issues if not addressed early.
                
                Focus on:
                - Technical architecture requirements and constraints
                - Integration requirements with existing systems
                - Data migration needs and approach
                - Performance requirements and SLAs
                - Security requirements and compliance
                - Testing and quality assurance
                - Post-deployment support and maintenance
                """,
                
                'consulting': """
                As a consulting expert for a discovery and assessment engagement, review this SOW and generate 3-5 critical questions
                that are often missed in assessment projects but can cause significant issues if not addressed early.
                
                Focus on:
                - Clarity on decision-making authority and processes
                - Definition of what constitutes success for the assessment
                - Expected format and detail level of deliverables
                - Client resource availability and expectations
                - Knowledge transfer expectations
                - Follow-on work expectations and transition
                """,
                
                'training': """
                As a training expert, review this SOW and generate 3-5 critical questions
                that are often missed in training projects but can cause significant issues if not addressed early.
                
                Focus on:
                - Target audience skill assessment
                - Learning outcome measurements
                - Training materials ownership and maintenance
                - Train-the-trainer needs
                - Ongoing support after training
                - Evaluation methods and success criteria
                """,
                
                'infrastructure': """
                As an infrastructure expert, review this SOW and generate 3-5 critical questions
                that are often missed in infrastructure projects but can cause significant issues if not addressed early.
                
                Focus on:
                - Environmental and system dependencies
                - Performance requirements and capacity planning
                - Maintenance and support expectations
                - Disaster recovery requirements
                - Security and compliance requirements
                - Integration with existing infrastructure
                """,
            }
            
            # Default prompt for other project types
            default_prompt = """
            Review this Statement of Work and generate 3-5 critical questions about potential gaps
            or ambiguities that should be addressed early in the project.
            
            Focus on:
            - Project scope boundaries
            - Governance and oversight
            - Communication expectations
            - Approval processes
            - Success criteria
            - Risk management
            """
            
            # Select appropriate prompt or use default
            prompt_template = industry_prompts.get(project_type, default_prompt)
            
            # Create a summary of the SOW for the prompt
            sections_summary = []
            key_sections = ['Scope', 'Deliverable', 'Timeline', 'Assumption']
            for section_name, section_content in sow_data.get('sections', {}).items():
                if any(keyword.lower() in section_name.lower() for keyword in key_sections):
                    sections_summary.append(f"## {section_name}\n{section_content}")
            
            combined_summary = "\n\n".join(sections_summary)
            
            # Build complete prompt
            prompt = f"""
            {prompt_template}
            
            SOW Summary:
            {combined_summary[:5000]}
            
            Format your response as a JSON array of objects with these keys:
            - question: The specific question text
            - context: Why this question is important
            - priority: A value from 1-3 (1 being highest priority)
            - category: The aspect of the project this question relates to (e.g., "Technical", "Process", "Governance")
            - target_stakeholder: Who is the best person to ask (e.g., "Product Owner", "Technical Lead", "Business Analyst")
            """
            
            response = self.model.generate_content(prompt)
            questions = self._parse_questions_from_response(response.text)
        
            return questions
        except Exception as e:
            print(f"Error generating industry-specific questions: {str(e)}")
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
                            if key in ['context', 'priority', 'item', 'category', 'target_stakeholder', 'risk_level']:
                                current_question[key] = value.strip()
                    
                    # Add the last question
                    if current_question and 'question' in current_question:
                        questions.append(current_question)
        
        except Exception as e:
            print(f"Error parsing questions from response: {str(e)}")
        
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
        3. Identify any inconsistencies with previously known information
        4. Determine if the answer raises new risks or issues that should be explored
        5. Generate follow-up questions if needed
        
        Format your response as a JSON object with these keys:
        - fully_answered: Boolean indicating if the original question is fully answered
        - reason: Brief explanation for your determination
        - followup_questions: Array of follow-up questions, each with:
          * question: The specific question text
          * context: Why this follow-up is needed
          * priority: A value from 1-3 (1 being highest priority)
          * category: What aspect this question addresses (e.g., "Clarification", "Risk", "New Information")
          * target_stakeholder: Who is the best person to ask about this follow-up
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
    
    def generate_requirements_summary(self, sow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a summary of requirements by clarity status
        
        Args:
            sow_data: Dictionary containing SOW sections, requirements, and boundaries
            
        Returns:
            Dictionary with summary information
        """
        requirements = sow_data.get('requirements', [])
        
        # Categorize requirements
        categorized_reqs = self._categorize_requirements(requirements)
        
        # Create summary
        summary = {
            "total_requirements": len(requirements),
            "clear_requirements": {
                "count": len(categorized_reqs["clear"]),
                "percentage": round(len(categorized_reqs["clear"]) / len(requirements) * 100, 1) if requirements else 0,
                "examples": [req.get("id") for req in categorized_reqs["clear"][:5]]
            },
            "ambiguous_requirements": {
                "count": sum(len(reqs) for reqs in categorized_reqs["ambiguous"].values()),
                "percentage": round(sum(len(reqs) for reqs in categorized_reqs["ambiguous"].values()) / len(requirements) * 100, 1) if requirements else 0,
                "by_category": {}
            },
            "boundaries": {
                "in_scope": len(sow_data.get('boundaries', {}).get('in_scope', [])),
                "out_of_scope": len(sow_data.get('boundaries', {}).get('out_of_scope', [])),
                "unclear": len(sow_data.get('boundaries', {}).get('unclear', []))
            }
        }
        
        # Add details for each ambiguity category
        for category, reqs in categorized_reqs["ambiguous"].items():
            summary["ambiguous_requirements"]["by_category"][category] = {
                "count": len(reqs),
                "percentage": round(len(reqs) / len(requirements) * 100, 1) if requirements else 0,
                "examples": [req.get("id") for req in reqs[:3]]
            }
            
        # Add section analysis
        section_analysis = defaultdict(lambda: {"total": 0, "clear": 0, "ambiguous": 0})
        for req in requirements:
            section = req.get("section", "Unknown")
            section_analysis[section]["total"] += 1
            
            if req.get("clarity") == "clear":
                section_analysis[section]["clear"] += 1
            else:
                section_analysis[section]["ambiguous"] += 1
        
        # Convert to regular dict and calculate percentages
        summary["by_section"] = {}
        for section, counts in section_analysis.items():
            summary["by_section"][section] = {
                "total": counts["total"],
                "clear": counts["clear"],
                "ambiguous": counts["ambiguous"],
                "clear_percentage": round(counts["clear"] / counts["total"] * 100, 1) if counts["total"] > 0 else 0,
                "ambiguous_percentage": round(counts["ambiguous"] / counts["total"] * 100, 1) if counts["total"] > 0 else 0
            }
            
        return summary