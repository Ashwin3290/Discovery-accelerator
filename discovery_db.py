import sqlite3
import json
import os
from typing import List, Dict, Any, Optional, Tuple
import datetime

class DiscoveryDatabase:
    def __init__(self, db_path: str = 'discovery.db'):
        """Initialize database connection and create tables if they don't exist"""
        self.db_path = db_path
        self.initialize_db()
    
    def initialize_db(self):
        """Create database tables if they don't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Projects table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            sow_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # SOW data table (stores parsed SOW data)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sow_data (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            sections TEXT,  -- JSON string of sections
            requirements TEXT,  -- JSON string of requirements
            boundaries TEXT,  -- JSON string of boundaries
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
        ''')
        
        # Questions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            parent_question_id INTEGER,
            question TEXT NOT NULL,
            context TEXT,
            source TEXT,
            source_text TEXT,
            priority INTEGER DEFAULT 3,
            status TEXT DEFAULT 'unanswered',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (parent_question_id) REFERENCES questions(id)
        )
        ''')
        
        # Meetings/Transcripts table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS transcripts (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            meeting_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transcript_text TEXT,
            processed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
        ''')
        
        # Answers table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY,
            question_id INTEGER NOT NULL,
            transcript_id INTEGER NOT NULL,
            answer_text TEXT,
            confidence FLOAT DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id),
            FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
        )
        ''')
        
        # New Information table (for additional topics from transcripts)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS new_information (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            transcript_id INTEGER,
            topic TEXT,
            transcript_excerpt TEXT,
            impact TEXT,
            priority INTEGER DEFAULT 3,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_project(self, name: str, sow_path: Optional[str] = None) -> int:
        """Create a new project and return its ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO projects (name, sow_path) VALUES (?, ?)",
            (name, sow_path)
        )
        
        project_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return project_id
    
    def store_sow_data(self, project_id: int, sow_data: Dict[str, Any]) -> bool:
        """Store parsed SOW data for a project"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Extract requirement matches if present
            requirement_matches = sow_data.pop('requirement_matches', {}) if 'requirement_matches' in sow_data else {}
            
            # Convert dictionaries to JSON strings
            sections_json = json.dumps(sow_data.get('sections', {}))
            requirements_json = json.dumps(sow_data.get('requirements', []))
            boundaries_json = json.dumps(sow_data.get('boundaries', {}))
            
            # Add requirement_matches back to data
            if requirement_matches:
                sow_data['requirement_matches'] = requirement_matches
            
            # Check if SOW data already exists for this project
            cursor.execute(
                "SELECT id FROM sow_data WHERE project_id = ?",
                (project_id,)
            )
            existing_id = cursor.fetchone()
            
            if existing_id:
                # Update existing SOW data
                cursor.execute(
                    "UPDATE sow_data SET sections = ?, requirements = ?, boundaries = ? WHERE id = ?",
                    (sections_json, requirements_json, boundaries_json, existing_id[0])
                )
            else:
                # Insert new SOW data
                cursor.execute(
                    "INSERT INTO sow_data (project_id, sections, requirements, boundaries) VALUES (?, ?, ?, ?)",
                    (project_id, sections_json, requirements_json, boundaries_json)
                )
            
            # Store requirement matches in a separate table if they exist
            if requirement_matches:
                # Check if requirement_matches table exists, if not create it
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS requirement_matches (
                    id INTEGER PRIMARY KEY,
                    project_id INTEGER NOT NULL,
                    requirement_id TEXT NOT NULL,
                    source_file TEXT,
                    keyword TEXT,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id)
                )
                ''')
                
                # Clear any existing matches for this project to avoid duplicates
                cursor.execute(
                    "DELETE FROM requirement_matches WHERE project_id = ?",
                    (project_id,)
                )
                
                # Store the new matches
                for req_id, matches in requirement_matches.items():
                    for match in matches:
                        cursor.execute(
                            """
                            INSERT INTO requirement_matches 
                            (project_id, requirement_id, source_file, keyword, context) 
                            VALUES (?, ?, ?, ?, ?)
                            """,
                            (
                                project_id,
                                req_id,
                                match.get('source_file', ''),
                                match.get('keyword', ''),
                                match.get('context', '')
                            )
                        )
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            print(f"Error storing SOW data: {str(e)}")
            conn.close()
            return False

    def get_project_sow_data(self, project_id: int) -> Optional[Dict[str, Any]]:
        """Get SOW data for a project including requirement matches"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM sow_data WHERE project_id = ? ORDER BY id DESC LIMIT 1",
            (project_id,)
        )
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        
        # Parse JSON strings back to dictionaries
        result = {
            'id': row['id'],
            'project_id': row['project_id'],
            'sections': json.loads(row['sections']),
            'requirements': json.loads(row['requirements']),
            'boundaries': json.loads(row['boundaries']),
            'created_at': row['created_at']
        }
        
        # Check if requirement_matches table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='requirement_matches'"
        )
        if cursor.fetchone():
            # Get requirement matches for this project
            cursor.execute(
                "SELECT * FROM requirement_matches WHERE project_id = ?",
                (project_id,)
            )
            
            # Organize matches by requirement ID
            requirement_matches = {}
            for match_row in cursor.fetchall():
                req_id = match_row['requirement_id']
                if req_id not in requirement_matches:
                    requirement_matches[req_id] = []
                
                requirement_matches[req_id].append({
                    'source_file': match_row['source_file'],
                    'keyword': match_row['keyword'],
                    'context': match_row['context']
                })
            
            result['requirement_matches'] = requirement_matches
        
        conn.close()
        return result
    
    def store_questions(self, questions: List[Dict[str, Any]], project_id: Optional[int] = None) -> List[int]:
        """Store questions and return their IDs"""
        if not questions:
            return []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        question_ids = []
        
        for q in questions:
            # Ensure we have a project_id
            q_project_id = project_id if project_id is not None else q.get('project_id')
            if not q_project_id:
                continue
            
            try:
                cursor.execute(
                    """
                    INSERT INTO questions 
                    (project_id, parent_question_id, question, context, source, source_text, priority, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        q_project_id,
                        q.get('parent_question_id'),
                        q.get('question', ''),
                        q.get('context', ''),
                        q.get('source', ''),
                        q.get('source_text', ''),
                        q.get('priority', 3),
                        q.get('status', 'unanswered')
                    )
                )
                
                question_ids.append(cursor.lastrowid)
            
            except Exception as e:
                print(f"Error storing question: {str(e)}")
        
        conn.commit()
        conn.close()
        
        return question_ids
    
    def get_question(self, question_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific question by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM questions WHERE id = ?", (question_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return {key: row[key] for key in row.keys()}
    
    def get_unanswered_questions(self, project_id: int) -> List[Dict[str, Any]]:
        """Get all unanswered questions for a project"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM questions WHERE project_id = ? AND status = 'unanswered' ORDER BY priority",
            (project_id,)
        )
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{key: row[key] for key in row.keys()} for row in rows]
    
    def update_question_status(self, question_id: int, status: str, answer: Optional[str] = None) -> bool:
        """Update a question's status"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "UPDATE questions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, question_id)
            )
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            print(f"Error updating question status: {str(e)}")
            conn.close()
            return False
    
    def store_transcript(self, project_id: int, transcript_text: str) -> int:
        """Store a meeting transcript and return its ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO transcripts (project_id, transcript_text) VALUES (?, ?)",
            (project_id, transcript_text)
        )
        
        transcript_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return transcript_id
    
    def store_answer(self, question_id: int, transcript_id: int, answer_text: str, confidence: float = 0.0) -> bool:
        """Store an answer extracted from a transcript"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "INSERT INTO answers (question_id, transcript_id, answer_text, confidence) VALUES (?, ?, ?, ?)",
                (question_id, transcript_id, answer_text, confidence)
            )
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            print(f"Error storing answer: {str(e)}")
            conn.close()
            return False
    
    def store_new_information(self, project_id: int, new_info: List[Dict[str, Any]], transcript_id: Optional[int] = None) -> List[int]:
        """Store new information topics identified from transcripts"""
        if not new_info:
            return []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        info_ids = []
        
        for info in new_info:
            try:
                cursor.execute(
                    """
                    INSERT INTO new_information 
                    (project_id, transcript_id, topic, transcript_excerpt, impact, priority) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        project_id,
                        transcript_id,
                        info.get('topic', ''),
                        info.get('transcript_excerpt', ''),
                        info.get('impact', ''),
                        info.get('priority', 3)
                    )
                )
                
                info_ids.append(cursor.lastrowid)
            
            except Exception as e:
                print(f"Error storing new information: {str(e)}")
        
        conn.commit()
        conn.close()
        
        return info_ids
    
    def get_discovery_status(self, project_id: int) -> Dict[str, Any]:
        """Get the current status of the discovery process for a project"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Count questions by status
        cursor.execute(
            "SELECT status, COUNT(*) as count FROM questions WHERE project_id = ? GROUP BY status",
            (project_id,)
        )
        status_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Count total questions
        total_questions = sum(status_counts.values())
        
        # Count transcripts
        cursor.execute(
            "SELECT COUNT(*) FROM transcripts WHERE project_id = ?",
            (project_id,)
        )
        transcript_count = cursor.fetchone()[0]
        
        # Check if there are any unanswered questions
        unanswered = status_counts.get('unanswered', 0) + status_counts.get('partially_answered', 0)
        discovery_complete = unanswered == 0 and total_questions > 0
        
        conn.close()
        
        return {
            'project_id': project_id,
            'total_questions': total_questions,
            'question_status': status_counts,
            'transcript_count': transcript_count,
            'discovery_complete': discovery_complete
        }
    
    def _get_connection(self):
        """Get a database connection with row factory enabled"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
