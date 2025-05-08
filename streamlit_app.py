import streamlit as st
import os
import requests
import json
import pandas as pd
import time
from datetime import datetime
import base64
from io import BytesIO
import matplotlib.pyplot as plt
from pathlib import Path
from streamlit_option_menu import option_menu
import streamlit_extras
from streamlit_extras.colored_header import colored_header
from streamlit_extras.card import card
from streamlit_extras.add_vertical_space import add_vertical_space
from streamlit_extras.metric_cards import style_metric_cards
from streamlit_extras.stylable_container import stylable_container

# Set page configuration
st.set_page_config(
    page_title="Discovery Accelerator",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    /* Main page styling */
    .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }
    
    /* Button styling */
    div.stButton > button {
        background-color: #4CAF50;
        color: white;
        font-weight: bold;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        transition: all 0.3s;
    }
    div.stButton > button:hover {
        background-color: #45a049;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }
    
    /* Card styling */
    div.css-1r6slb0.e1tzin5v2 {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    
    /* Header styling */
    h1, h2, h3, h4, h5 {
        color: #2c3e50;
        font-family: 'Roboto', sans-serif;
    }
    h1 {
        border-bottom: 2px solid #4CAF50;
        padding-bottom: 0.5rem;
        margin-bottom: 2rem;
    }
    
    /* Table styling */
    div.stDataFrame {
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
    }
    
    /* Metric styling */
    div.css-50ug3q {
        font-weight: bold;
    }
    
    /* Info boxes */
    div.stAlert {
        border-radius: 8px;
    }
    
    /* Status indicators */
    .status-unanswered {
        color: #e74c3c;
        font-weight: bold;
    }
    .status-partially {
        color: #f39c12;
        font-weight: bold;
    }
    .status-answered {
        color: #2ecc71;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# Define API URL
API_URL = "http://localhost:4000"  # Change this if your API is hosted elsewhere

# Helper functions
def get_file_content_as_base64(file_path):
    """Get file content as base64 encoded string for display"""
    with open(file_path, "rb") as f:
        data = f.read()
    return base64.b64encode(data).decode()

def display_pdf(file_path):
    """Display a PDF file in Streamlit"""
    # Read PDF file
    with open(file_path, "rb") as f:
        base64_pdf = base64.b64encode(f.read()).decode('utf-8')
    
    # Display PDF
    pdf_display = F'<iframe src="data:application/pdf;base64,{base64_pdf}" width="100%" height="600" type="application/pdf"></iframe>'
    st.markdown(pdf_display, unsafe_allow_html=True)

def save_uploaded_file(uploaded_file, directory="temp"):
    """Save uploaded file to a temporary directory"""
    # Create directory if it doesn't exist
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    # Save file
    file_path = os.path.join(directory, uploaded_file.name)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    
    return file_path

def api_request(endpoint, method="GET", data=None, files=None):
    """Make an API request to the backend"""
    url = f"{API_URL}/{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url)
        elif method.upper() == "POST":
            response = requests.post(url, json=data)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return None

def get_projects():
    """Get list of projects from API"""
    response = api_request("list_projects")
    if response and response.get("status") == "success":
        return response.get("projects", [])
    return []

def create_progress_chart(project_status):
    """Create a pie chart showing question status"""
    status_counts = project_status.get('question_status', {})
    labels = []
    sizes = []
    colors = []
    
    status_colors = {
        'unanswered': '#FF6B6B',
        'partially_answered': '#FFD166',
        'answered': '#06D6A0'
    }
    
    for status, count in status_counts.items():
        labels.append(status)
        sizes.append(count)
        colors.append(status_colors.get(status, '#CCCCCC'))
    
    # If no data, show placeholder
    if not labels:
        labels = ['No Questions']
        sizes = [1]
        colors = ['#CCCCCC']
    
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.pie(sizes, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90, 
           textprops={'fontsize': 12, 'weight': 'bold'})
    ax.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle
    
    # Add a title to the chart
    plt.title('Question Status Distribution', fontsize=16, fontweight='bold', pad=20)
    
    return fig

# Sidebar navigation
with st.sidebar:
    st.image("https://i.imgur.com/O0PYcTs.png", width=250)  # Replace with your actual logo
    st.write("#### Discovery Accelerator")

    selected = option_menu(
        menu_title=None,
        options=["Start Discovery", "Process Transcripts", "View Questions", "Discovery Status", "Reports"],
        icons=["rocket-takeoff", "mic", "question-circle", "speedometer", "file-earmark-text"],
        menu_icon="cast",
        default_index=0,
        styles={
            "container": {"padding": "0!important", "background-color": "#f0f2f6"},
            "icon": {"color": "#4CAF50", "font-size": "16px"},
            "nav-link": {"font-size": "14px", "text-align": "left", "margin": "0px", "--hover-color": "#eee"},
            "nav-link-selected": {"background-color": "#4CAF50", "color": "white"},
        }
    )
    
    st.markdown("---")
    st.info(
        "Discovery Accelerator v1.0\n\n"
        "A tool to streamline discovery processes for service-based companies."
    )

# Main content
if selected == "Start Discovery":
    colored_header(
        label="Discovery Process",
        description="Upload SOW document and additional materials to process",
        color_name="green-70"
    )

    with stylable_container(
        key="process_documents_container",
        css_styles="""
            {
                border: 1px solid #ddd;
                border-radius: 0.5rem;
                padding: 1rem;
                background-color: #f8f9fa;
            }
        """
    ):
        # Project name input
        doc_project_name = st.text_input("Project Name", placeholder="Enter a name for this discovery project", key="doc_project_name")
        
        # SOW document upload
        st.subheader("Statement of Work (SOW)")
        sow_file = st.file_uploader("Upload SOW Document", type=["pdf", "docx"], key="sow")
        
        if sow_file:
            sow_path = save_uploaded_file(sow_file)
            st.success(f"SOW file saved: {sow_file.name}")
            
            # Preview SOW if PDF
            if sow_file.name.lower().endswith('.pdf'):
                with st.expander("Preview SOW Document"):
                    display_pdf(sow_path)
        
        # Additional documents upload
        st.subheader("Additional Documents (Optional)")
        additional_files = st.file_uploader("Upload Additional Documents", 
                                            type=["pdf", "docx", "pptx", "jpg", "jpeg", "png"], 
                                            accept_multiple_files=True,
                                            key="additional")
        
        additional_paths = []
        if additional_files:
            for file in additional_files:
                file_path = save_uploaded_file(file)
                additional_paths.append(file_path)
                st.write(f"✅ {file.name}")
        
        # Process documents button
        col1, col2, col3 = st.columns([1, 1, 1])
        with col2:
            process_btn = st.button("Process Documents", 
                         disabled=not (doc_project_name and sow_file), 
                         key="process_docs_btn", 
                         use_container_width=True)
        
        if process_btn:
            with st.spinner("Processing documents and extracting SOW data..."):
                # Make API call to process documents
                data = {
                    "project_name": doc_project_name,
                    "sow_path": sow_path,
                    "additional_docs_paths": additional_paths if additional_paths else None
                }
                
                response = api_request("process_documents", method="POST", data=data)
                
                if response and response.get("status") == "success":
                    st.success(f"Document processing completed successfully!")
                    
                    # Show details
                    with st.expander("Processing Results", expanded=True):
                        col1, col2 = st.columns(2)
                        with col1:
                            st.metric("Project ID", response.get('project_id'))
                        with col2:
                            st.metric("Project Name", response.get('project_name'))
                        
                    # Direct user to the View Questions tab
                    st.info("Proceed to the 'View Questions' tab to view or generate discovery questions.")
                else:
                    st.error("Failed to process documents.")
                    if response:
                        st.json(response)


elif selected == "Process Transcripts":
    colored_header(
        label="Process Meeting Transcripts",
        description="Upload meeting transcripts to extract answers and generate follow-up questions",
        color_name="green-70"
    )

    with stylable_container(
        key="transcript_container",
        css_styles="""
            {
                border: 1px solid #ddd;
                border-radius: 0.5rem;
                padding: 1rem;
                background-color: #f8f9fa;
            }
        """
    ):
        # Get available projects
        projects = get_projects()
        
        if not projects:
            st.warning("No projects found. Please start a discovery process first.")
        else:
            # Select project
            selected_project = st.selectbox("Select Project", projects)
            
            # Get project ID
            project_id = None
            for i, project in enumerate(projects):
                if project == selected_project:
                    project_id = i + 1  # Simple assumption that project IDs start from 1
            
            if project_id:
                # Transcript input methods
                input_method = st.radio("Transcript Input Method", ["Upload File", "Paste Text"])
                
                transcript_text = ""
                if input_method == "Upload File":
                    transcript_file = st.file_uploader("Upload Transcript File", type=["txt", "docx"])
                    
                    if transcript_file:
                        if transcript_file.name.lower().endswith('.txt'):
                            transcript_text = transcript_file.getvalue().decode("utf-8")
                        elif transcript_file.name.lower().endswith('.docx'):
                            import docx
                            file_path = save_uploaded_file(transcript_file)
                            doc = docx.Document(file_path)
                            transcript_text = "\n".join([para.text for para in doc.paragraphs])
                        
                        st.write("Preview:")
                        st.text_area("Transcript Content", transcript_text, height=200, disabled=True)
                else:
                    transcript_text = st.text_area("Paste Transcript Text", height=300)
                
                # Process transcript button
                col1, col2, col3 = st.columns([1, 2, 1])
                with col2:
                    process_transcript_btn = st.button("Process Transcript", 
                                           disabled=not transcript_text,
                                           use_container_width=True)
                
                if process_transcript_btn:
                    with st.spinner("Processing transcript, extracting answers, and generating follow-up questions..."):
                        # Make API call to process transcript
                        data = {
                            "project_id": project_id,
                            "transcript_text": transcript_text
                        }
                        
                        response = api_request("process_transcript", method="POST", data=data)
                        
                        if response and response.get("status") == "success":
                            st.success(f"Transcript processed successfully. Found {response.get('answers_found', 0)} answers.")
                            
                            # Display follow-up questions
                            if response.get('followup_questions'):
                                colored_header("Follow-up Questions Generated", "", "green-50")
                                followup_df = pd.DataFrame(response.get('followup_questions'))
                                st.dataframe(followup_df, use_container_width=True)
                            
                            # Show discovery status
                            if response.get('discovery_status'):
                                colored_header("Current Discovery Status", "", "green-50")
                                status = response.get('discovery_status')
                                col1, col2 = st.columns(2)
                                
                                with col1:
                                    st.metric("Total Questions", status.get('total_questions', 0))
                                    st.metric("Unanswered Questions", 
                                             status.get('question_status', {}).get('unanswered', 0))
                                
                                with col2:
                                    st.metric("Transcripts Processed", status.get('transcript_count', 0))
                                    st.metric("Completion Status", 
                                             "Complete" if status.get('discovery_complete', False) else "In Progress")
                                
                                # Apply custom styling to metrics
                                style_metric_cards()
                                
                                # Progress chart
                                st.pyplot(create_progress_chart(status))
                            
                            # Provide link to questions page
                            st.info("Go to 'View Questions' to see all questions or 'Discovery Status' for more details.")
                        else:
                            st.error("Failed to process transcript.")

elif selected == "View Questions":
    colored_header(
        label="View and Manage Questions",
        description="View current questions, their status, and answers",
        color_name="green-70"
    )

    with stylable_container(
        key="questions_container",
        css_styles="""
            {
                border: 1px solid #ddd;
                border-radius: 0.5rem;
                padding: 1rem;
                background-color: #f8f9fa;
            }
        """
    ):
        # Get available projects
        projects = get_projects()
        
        if not projects:
            st.warning("No projects found. Please start a discovery process first.")
        else:
            # Select project
            selected_project = st.selectbox("Select Project", projects)
            
            # Get project ID
            project_id = None
            for i, project in enumerate(projects):
                if project == selected_project:
                    project_id = i + 1  # Simple assumption that project IDs start from 1
            
            if project_id:
                # Filter options
                status_options = ["All", "Unanswered", "Partially Answered", "Answered"]
                status_icons = ["❓", "🔴", "🟠", "🟢"]
                status_filter = st.radio(
                    "Filter by Status", 
                    options=status_options,
                    format_func=lambda x: f"{status_icons[status_options.index(x)]} {x}"
                )
                
                status_param = None
                if status_filter != "All":
                    status_param = status_filter.lower().replace(" ", "_")
                
                # Make API call to get questions
                endpoint = f"get_questions/{project_id}"
                if status_param:
                    endpoint += f"?status={status_param}"
                
                response = api_request(endpoint)
                
                if response and response.get("status") == "success":
                    questions = response.get('questions', [])
                    
                    if not questions and status_filter == "All":
                        st.warning("No questions found for this project.")
                        
                        # Generate questions button
                        col1, col2, col3 = st.columns([1, 2, 1])
                        with col2:
                            gen_questions_btn = st.button(
                                "Generate Questions for This Project", 
                                key="gen_questions_project_btn",
                                use_container_width=True
                            )
                        
                        if gen_questions_btn:
                            with st.spinner("Generating questions based on SOW analysis..."):
                                # Make API call to generate questions directly
                                data = {
                                    "project_id": project_id
                                }
                                
                                response = api_request("generate_questions_by_id", method="POST", data=data)
                                
                                if response and response.get("status") == "success":
                                    # Already made the API call above to generate questions directly
                                    
                                    # Display results from the API call
                                    st.success(f"Question generation completed successfully! Generated {response.get('initial_questions_count', 0)} questions.")
                                    
                                    # Display initial questions
                                    if response.get('questions'):
                                        st.subheader("Generated Questions")
                                        questions_df = pd.DataFrame(response.get('questions'))
                                        st.dataframe(questions_df)
                                        
                                        # Reload the page to see questions (message only)
                                        st.info("The questions have been generated. You'll see them in the list after refreshing.")
                                else:
                                    st.error("Failed to generate questions.")
                                    if response:
                                        st.json(response)
                    elif not questions:
                        st.info("No questions found with the selected filter.")
                    else:
                        # Prepare data for display
                        display_data = []
                        for q in questions:
                            answer_text = ""
                            if 'answer' in q:
                                answer_text = q['answer'].get('answer_text', '')
                            
                            status_display = q.get('status', '')
                            if status_display == 'unanswered':
                                status_display = f"<span class='status-unanswered'>⚠️ Unanswered</span>"
                            elif status_display == 'partially_answered':
                                status_display = f"<span class='status-partially'>⚠️ Partially Answered</span>"
                            elif status_display == 'answered':
                                status_display = f"<span class='status-answered'>✅ Answered</span>"
                            
                            display_data.append({
                                'ID': q.get('id'),
                                'Question': q.get('question'),
                                'Status': status_display,
                                'Priority': q.get('priority'),
                                'Source': q.get('source'),
                                'Answer': answer_text
                            })
                        
                        # Display as dataframe
                        st.markdown("### Questions")
                        questions_df = pd.DataFrame(display_data)
                        st.dataframe(questions_df.style.format({"Status": lambda x: x}), 
                                    use_container_width=True,
                                    height=400)
                        
                        # Allow export
                        csv = questions_df.to_csv(index=False)
                        st.download_button(
                            "📥 Download Questions as CSV",
                            csv,
                            f"{selected_project}_questions.csv",
                            "text/csv",
                            key='download-csv'
                        )
                        
                        # Detail view of a specific question
                        colored_header("Question Details", "", "green-50")
                        question_ids = [q.get('id') for q in questions]
                        selected_question_id = st.selectbox("Select Question ID to View Details", question_ids)
                        
                        # Find the selected question
                        selected_question = None
                        for q in questions:
                            if q.get('id') == selected_question_id:
                                selected_question = q
                                break
                        
                        if selected_question:
                            with stylable_container(
                                key="question_detail_container",
                                css_styles="""
                                    {
                                        border: 1px solid #ddd;
                                        border-radius: 0.5rem;
                                        padding: 1rem;
                                        background-color: #f5f5f5;
                                    }
                                """
                            ):
                                col1, col2 = st.columns(2)
                                
                                with col1:
                                    card(
                                        title="Question Information",
                                        content=f"{selected_question.get('question')}",
                                        image=None,
                                        styles={
                                            "card": {
                                                "width": "100%",
                                                "height": "auto",
                                                "border-radius": "10px",
                                                "box-shadow": "0 0 10px rgba(0,0,0,0.1)",
                                                "margin-bottom": "1rem"
                                            }
                                        }
                                    )
                                    
                                    st.markdown("**Context:**")
                                    st.write(selected_question.get('context', 'No context provided'))
                                    
                                    st.markdown("**Source:**")
                                    st.write(selected_question.get('source', 'Unknown source'))
                                    
                                    st.markdown("**Priority:**")
                                    st.write(f"{selected_question.get('priority', 'N/A')} (1 highest, 3 lowest)")
                                
                                with col2:
                                    status = selected_question.get('status', 'Unknown')
                                    
                                    if status == 'unanswered':
                                        status_color = "red"
                                        status_icon = "⚠️"
                                    elif status == 'partially_answered':
                                        status_color = "orange"
                                        status_icon = "⚠️"
                                    else:
                                        status_color = "green"
                                        status_icon = "✅"
                                    
                                    st.markdown(f"**Status:** <span style='color:{status_color};font-weight:bold;'>{status_icon} {status.title()}</span>", unsafe_allow_html=True)
                                    
                                    st.markdown("**Answer:**")
                                    if 'answer' in selected_question:
                                        answer_card_content = f"""
                                        {selected_question['answer'].get('answer_text', 'No answer text')}
                                        
                                        **Confidence:** {selected_question['answer'].get('confidence', 'N/A')}
                                        
                                        **Date:** {selected_question['answer'].get('meeting_date', 'Unknown')}
                                        """
                                        
                                        card(
                                            title="Answer Details",
                                            content=answer_card_content,
                                            image=None,
                                            styles={
                                                "card": {
                                                    "width": "100%",
                                                    "height": "auto",
                                                    "border-radius": "10px",
                                                    "box-shadow": "0 0 10px rgba(0,0,0,0.1)",
                                                    "background-color": "#f8f9fa"
                                                }
                                            }
                                        )
                                    else:
                                        st.info("No answer available")

elif selected == "Discovery Status":
    colored_header(
        label="Discovery Status Dashboard",
        description="Check the current status of the discovery process",
        color_name="green-70"
    )

    with stylable_container(
        key="status_container",
        css_styles="""
            {
                border: 1px solid #ddd;
                border-radius: 0.5rem;
                padding: 1rem;
                background-color: #f8f9fa;
            }
        """
    ):
        # Get available projects
        projects = get_projects()
        
        if not projects:
            st.warning("No projects found. Please start a discovery process first.")
        else:
            # Select project
            selected_project = st.selectbox("Select Project", projects)
            
            # Get project ID
            project_id = None
            for i, project in enumerate(projects):
                if project == selected_project:
                    project_id = i + 1  # Simple assumption that project IDs start from 1
            
            if project_id:
                # Get discovery status
                response = api_request(f"discovery_status/{project_id}")
                
                if response and response.get("status") == "success":
                    status = response.get('discovery_status', {})
                    
                    # Display stats
                    st.subheader("Discovery Progress")
                    
                    # Create metrics cards with custom styling
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("Total Questions", status.get('total_questions', 0))
                    
                    with col2:
                        st.metric("Answered Questions", 
                                 status.get('question_status', {}).get('answered', 0))
                    
                    with col3:
                        st.metric("Partially Answered", 
                                 status.get('question_status', {}).get('partially_answered', 0))
                    
                    with col4:
                        st.metric("Unanswered", 
                                 status.get('question_status', {}).get('unanswered', 0))
                    
                    # Apply custom styling to metrics
                    style_metric_cards()
                    
                    # Display pie chart
                    st.pyplot(create_progress_chart(status))
                    
                    # Display completion status
                    completion_status = status.get('discovery_complete', False)
                    if completion_status:
                        st.success("✅ Discovery Process Complete")
                    else:
                        st.warning("🔄 Discovery Process In Progress")
                        
                        # Calculate completion percentage
                        total = status.get('total_questions', 0)
                        unanswered = status.get('question_status', {}).get('unanswered', 0)
                        partially = status.get('question_status', {}).get('partially_answered', 0)
                        
                        if total > 0:
                            completion_pct = 100 - ((unanswered + partially / 2) / total * 100)
                            
                            # Create a styled progress bar
                            st.markdown(f"""
                            <div style="border-radius:10px;overflow:hidden;background-color:#f0f0f0;height:20px;">
                                <div style="background-color:#4CAF50;width:{min(completion_pct, 100)}%;height:20px;"></div>
                            </div>
                            <p style="text-align:center;margin-top:5px;font-weight:bold;">
                                Estimated completion: {completion_pct:.1f}%
                            </p>
                            """, unsafe_allow_html=True)
                    
                    # Transcript count
                    colored_header("Transcripts Processed", "", "green-50")
                    
                    with stylable_container(
                        key="transcript_stats",
                        css_styles="""
                            {
                                background-color: #f5f5f5;
                                border-radius: 0.5rem;
                                padding: 1rem;
                                border: 1px solid #ddd;
                            }
                        """
                    ):
                        st.metric("Total Transcripts", status.get('transcript_count', 0))
                    
                    # Links to other sections
                    add_vertical_space(2)
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        with stylable_container(
                            key="link_questions",
                            css_styles="""
                                {
                                    background-color: #e8f4ea;
                                    border-radius: 0.5rem;
                                    padding: 1rem;
                                    border: 1px solid #4CAF50;
                                    text-align: center;
                                }
                            """
                        ):
                            st.info("Go to 'View Questions' to manage questions")
                    
                    with col2:
                        with stylable_container(
                            key="link_transcripts",
                            css_styles="""
                                {
                                    background-color: #e8f4ea;
                                    border-radius: 0.5rem;
                                    padding: 1rem;
                                    border: 1px solid #4CAF50;
                                    text-align: center;
                                }
                            """
                        ):
                            st.info("Go to 'Process Transcripts' to add more transcript data")