"""
Database Migration Script for Additional Document Processing
This script safely updates the database schema to support additional document processing.
"""

import sqlite3
import os
import traceback

def safe_add_column(cursor, table_name, column_name, column_definition):
    """Safely add a column to a table if it doesn't already exist"""
    try:
        # Check if column exists
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [row[1] for row in cursor.fetchall()]
        
        if column_name not in columns:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")
            print(f"✓ Added column {column_name} to {table_name}")
        else:
            print(f"⚠ Column {column_name} already exists in {table_name}")
    except Exception as e:
        print(f"✗ Error adding column {column_name} to {table_name}: {str(e)}")
        raise

def safe_create_table(cursor, table_name, create_sql):
    """Safely create a table if it doesn't already exist"""
    try:
        cursor.execute(create_sql)
        print(f"✓ Created table {table_name}")
    except sqlite3.OperationalError as e:
        if "already exists" in str(e):
            print(f"⚠ Table {table_name} already exists")
        else:
            print(f"✗ Error creating table {table_name}: {str(e)}")
            raise
    except Exception as e:
        print(f"✗ Unexpected error creating table {table_name}: {str(e)}")
        raise

def migrate_database(db_path='discovery.db'):
    """Migrate the database to support additional document processing"""
    print(f"\n==== STARTING DATABASE MIGRATION ====")
    print(f"Database path: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"✗ Database file {db_path} does not exist!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n1. Adding new columns to existing tables...")
        
        # Add new columns to questions table
        safe_add_column(cursor, 'questions', 'source_type', 'TEXT DEFAULT "sow"')
        safe_add_column(cursor, 'questions', 'source_document_id', 'INTEGER')
        safe_add_column(cursor, 'questions', 'confidence_score', 'FLOAT DEFAULT 0.0')
        
        print("\n2. Creating new tables for additional document processing...")
        
        # Additional Documents table
        safe_create_table(cursor, 'additional_documents', '''
        CREATE TABLE IF NOT EXISTS additional_documents (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            original_filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_date TIMESTAMP,
            processing_status TEXT DEFAULT 'pending',
            content_extracted TEXT,
            answers_found INTEGER DEFAULT 0,
            questions_generated INTEGER DEFAULT 0,
            requirement_matches INTEGER DEFAULT 0,
            notes TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
        ''')
        
        # Document Answers table
        safe_create_table(cursor, 'document_answers', '''
        CREATE TABLE IF NOT EXISTS document_answers (
            id INTEGER PRIMARY KEY,
            question_id INTEGER NOT NULL,
            document_id INTEGER NOT NULL,
            answer_text TEXT,
            confidence FLOAT DEFAULT 0.0,
            document_section TEXT,
            extraction_method TEXT DEFAULT 'gemini',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id),
            FOREIGN KEY (document_id) REFERENCES additional_documents(id)
        )
        ''')
        
        # Document Questions table
        safe_create_table(cursor, 'document_questions', '''
        CREATE TABLE IF NOT EXISTS document_questions (
            id INTEGER PRIMARY KEY,
            question_id INTEGER NOT NULL,
            source_document_id INTEGER NOT NULL,
            document_section TEXT,
            generated_from TEXT,
            relevance_score FLOAT DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id),
            FOREIGN KEY (source_document_id) REFERENCES additional_documents(id)
        )
        ''')
        
        # Document Processing Log table
        safe_create_table(cursor, 'document_processing_log', '''
        CREATE TABLE IF NOT EXISTS document_processing_log (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            document_id INTEGER,
            processing_step TEXT NOT NULL,
            processing_status TEXT NOT NULL,
            processing_details TEXT,
            error_message TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (document_id) REFERENCES additional_documents(id)
        )
        ''')
        
        print("\n3. Creating indexes for better performance...")
        
        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_additional_docs_project ON additional_documents(project_id)",
            "CREATE INDEX IF NOT EXISTS idx_document_answers_question ON document_answers(question_id)",
            "CREATE INDEX IF NOT EXISTS idx_document_answers_document ON document_answers(document_id)",
            "CREATE INDEX IF NOT EXISTS idx_questions_source_type ON questions(source_type)",
            "CREATE INDEX IF NOT EXISTS idx_questions_project_status ON questions(project_id, status)",
        ]
        
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
                print(f"✓ Created index")
            except Exception as e:
                print(f"⚠ Index creation: {str(e)}")
        
        print("\n4. Updating existing data...")
        
        # Update existing questions to have source_type = 'sow' if not set
        cursor.execute("UPDATE questions SET source_type = 'sow' WHERE source_type IS NULL OR source_type = ''")
        updated_rows = cursor.rowcount
        if updated_rows > 0:
            print(f"✓ Updated {updated_rows} questions with source_type")
        
        print("\n5. Committing changes...")
        conn.commit()
        
        print("\n6. Verifying migration...")
        
        # Verify tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = [
            'additional_documents', 
            'document_answers', 
            'document_questions', 
            'document_processing_log'
        ]
        
        for table in expected_tables:
            if table in tables:
                print(f"✓ Table {table} exists")
            else:
                print(f"✗ Table {table} missing")
        
        # Verify new columns
        cursor.execute("PRAGMA table_info(questions)")
        question_columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ['source_type', 'source_document_id', 'confidence_score']
        for col in expected_columns:
            if col in question_columns:
                print(f"✓ Column questions.{col} exists")
            else:
                print(f"✗ Column questions.{col} missing")
        
        conn.close()
        
        print(f"\n==== DATABASE MIGRATION COMPLETED SUCCESSFULLY ====")
        return True
        
    except Exception as e:
        print(f"\n==== DATABASE MIGRATION FAILED ====")
        print(f"Error: {str(e)}")
        traceback.print_exc()
        
        try:
            conn.rollback()
            conn.close()
        except:
            pass
            
        return False

def check_database_status(db_path='discovery.db'):
    """Check the current status of the database"""
    print(f"\n==== DATABASE STATUS CHECK ====")
    
    if not os.path.exists(db_path):
        print(f"✗ Database file {db_path} does not exist!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Existing tables ({len(tables)}):")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  - {table}: {count} records")
        
        # Check questions table columns
        if 'questions' in tables:
            cursor.execute("PRAGMA table_info(questions)")
            columns = [row[1] for row in cursor.fetchall()]
            print(f"\nQuestions table columns: {', '.join(columns)}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking database: {str(e)}")

if __name__ == "__main__":
    import sys
    
    # Default database path
    db_path = 'discovery.db'
    
    # Check if custom path provided
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    print("Discovery Accelerator Database Migration Tool")
    print("=" * 50)
    
    # Check current status
    check_database_status(db_path)
    
    # Confirm migration
    response = input("\nProceed with migration? (y/N): ").strip().lower()
    
    if response == 'y':
        success = migrate_database(db_path)
        if success:
            print("\n✅ Migration completed successfully!")
            print("You can now use the additional document processing features.")
        else:
            print("\n❌ Migration failed!")
            print("Please check the error messages above and try again.")
    else:
        print("Migration cancelled.")
