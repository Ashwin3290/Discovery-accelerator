import streamlit as st
import hydralit as hy
import hydralit_components as hc
import os
import requests
import json
import pandas as pd
import time
import numpy as np
from datetime import datetime
import base64
from io import BytesIO
import matplotlib.pyplot as plt
from pathlib import Path
from streamlit_extras.colored_header import colored_header
from streamlit_extras.card import card
from streamlit_extras.add_vertical_space import add_vertical_space
from streamlit_extras.metric_cards import style_metric_cards
from streamlit_extras.stylable_container import stylable_container

# Initialize Hydralit
app = hy.HydraApp(
    title='Discovery Accelerator',
    favicon="🔍",
    navbar_theme={"txc_inactive": "#FFFFFF", 
                 "menu_background": "#2c3e50",
                 "txc_active": "#FFFFFF",
                 "option_active": "#4CAF50"},
    hide_streamlit_markers=True,
    use_navbar=True, 
    navbar_sticky=False,
    navbar_animation=True
)

# Define API URL
API_URL = "http://localhost:4000"  # Change this if your API is hosted elsewhere

# Custom CSS for the entire app
app_css = """
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
"""

# Add CSS to app
st.markdown(app_css, unsafe_allow_html=True)

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

def loading_screen():
    # Create a custom loading screen using Hydralit components
    with hc.HyLoader('Loading Discovery Accelerator', 
                    hc.Loaders.standard_loaders, 
                    index=2):
        time.sleep(1.5)

# Define the Start Discovery page
@app.addapp(title='Start Discovery', icon="🚀")
def start_discovery():
    # Show a notification alert at the top with app info
    hc.info_card(title='Discovery Accelerator', 
                content='Upload your SOW document and additional materials to process', 
                sentiment='good',
                bar_value=100)
    
    colored_header(
        label="Discovery Process",
        description="Upload SOW document and additional materials to process",
        color_name="green-70"
    )

    with hc.box(border_shadow=True, shadow=True, width=100):
        # Project name input
        st.markdown("### Project Details")
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
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            process_btn = st.button("Process Documents", 
                        disabled=not (doc_project_name and sow_file), 
                        key="process_docs_btn", 
                        use_container_width=True)
        
        if process_btn:
            with hc.HyLoader('Processing documents and extracting SOW data...', 
                           hc.Loaders.standard_loaders, 
                           index=3):
                # Make API call to process documents
                data = {
                    "project_name": doc_project_name,
                    "sow_path": sow_path,
                    "additional_docs_paths": additional_paths if additional_paths else None
                }
                
                response = api_request("process_documents", method="POST", data=data)
                
                if response and response.get("status") == "success":
                    # Show success info card
                    hc.info_card(title='Success!', 
                                content=f"Document processing completed successfully!", 
                                sentiment='good',
                                bar_value=100)
                    
                    # Show details
                    with st.expander("Processing Results", expanded=True):
                        col1, col2 = st.columns(2)
                        with col1:
                            st.metric("Project ID", response.get('project_id'))
                        with col2:
                            st.metric("Project Name", response.get('project_name'))
                    
                    # Direct user to the View Questions tab
                    hc.info_card(title='Next Steps', 
                                content="Proceed to the 'View Questions' tab to view or generate discovery questions.", 
                                sentiment='neutral',
                                bar_value=75)
                else:
                    hc.info_card(title='Error', 
                                content="Failed to process documents.", 
                                sentiment='negative',
                                bar_value=100)
                    if response:
                        st.json(response)

# Define the Process Transcripts page
@app.addapp(title='Process Transcripts', icon="🎙️")
def process_transcripts():
    # Show a notification alert at the top with app info
    hc.info_card(title='Process Meeting Transcripts', 
                content='Upload meeting transcripts to extract answers and generate follow-up questions', 
                sentiment='good',
                bar_value=100)
    
    colored_header(
        label="Process Meeting Transcripts",
        description="Upload meeting transcripts to extract answers and generate follow-up questions",
        color_name="green-70"
    )

    with hc.box(border_shadow=True, shadow=True, width=100):
        # Get available projects
        projects = get_projects()
        
        if not projects:
            hc.info_card(title='No Projects Found', 
                        content='Please start a discovery process first.', 
                        sentiment='warning',
                        bar_value=100)
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
                    with hc.HyLoader('Processing transcript, extracting answers, and generating follow-up questions...', 
                                     hc.Loaders.standard_loaders, 
                                     index=3):
                        # Make API call to process transcript
                        data = {
                            "project_id": project_id,
                            "transcript_text": transcript_text
                        }
                        
                        response = api_request("process_transcript", method="POST", data=data)
                        
                        if response and response.get("status") == "success":
                            hc.info_card(title='Success!', 
                                        content=f"Transcript processed successfully. Found {response.get('answers_found', 0)} answers.", 
                                        sentiment='good',
                                        bar_value=100)
                            
                            # Display follow-up questions
                            if response.get('followup_questions'):
                                colored_header("Follow-up Questions Generated", "", "green-50")
                                followup_df = pd.DataFrame(response.get('followup_questions'))
                                st.dataframe(followup_df, use_container_width=True)
                            
                            # Show discovery status
                            if response.get('discovery_status'):
                                colored_header("Current Discovery Status", "", "green-50")
                                status = response.get('discovery_status')
                                
                                metric_row1 = [
                                    {"label": "Total Questions", "value": status.get('total_questions', 0)},
                                    {"label": "Unanswered Questions", "value": status.get('question_status', {}).get('unanswered', 0)},
                                    {"label": "Transcripts Processed", "value": status.get('transcript_count', 0)},
                                    {"label": "Completion Status", "value": "Complete" if status.get('discovery_complete', False) else "In Progress"}
                                ]
                                
                                hc.metric_row(metric_row1)
                                
                                # Progress chart
                                st.pyplot(create_progress_chart(status))
                            
                            # Provide link to questions page
                            hc.info_card(title='Next Steps', 
                                        content="Go to 'View Questions' to see all questions or 'Discovery Status' for more details.", 
                                        sentiment='neutral',
                                        bar_value=75)
                        else:
                            hc.info_card(title='Error', 
                                        content="Failed to process transcript.", 
                                        sentiment='negative',
                                        bar_value=100)

# Define the View Questions page
@app.addapp(title='View Questions', icon="❓")
def view_questions():
    # Show a notification alert at the top with app info
    hc.info_card(title='View and Manage Questions', 
                content='View current questions, their status, and answers', 
                sentiment='good',
                bar_value=100)
    
    colored_header(
        label="View and Manage Questions",
        description="View current questions, their status, and answers",
        color_name="green-70"
    )

    with hc.box(border_shadow=True, shadow=True, width=100):
        # Get available projects
        projects = get_projects()
        
        if not projects:
            hc.info_card(title='No Projects Found', 
                        content='Please start a discovery process first.', 
                        sentiment='warning',
                        bar_value=100)
        else:
            # Select project
            selected_project = st.selectbox("Select Project", projects)
            
            # Get project ID
            project_id = None
            for i, project in enumerate(projects):
                if project == selected_project:
                    project_id = i + 1  # Simple assumption that project IDs start from 1
            
            if project_id:
                # Filter options with a fancy status selector using Hydralit components
                over_theme = {'txc_inactive': 'white', 'menu_background': '#2c3e50', 'txc_active': 'white',
                             'option_active': '#4CAF50'}
                
                status_filter = hc.option_bar(
                    option_definition=[
                        {'icon': "bi bi-list-task", 'label': "All"},
                        {'icon': "bi bi-x-circle", 'label': "Unanswered"},
                        {'icon': "bi bi-dash-circle", 'label': "Partially Answered"},
                        {'icon': "bi bi-check-circle", 'label': "Answered"}
                    ],
                    key='StatusFilter',
                    override_theme=over_theme,
                    horizontal_orientation=True
                )
                
                status_param = None
                if status_filter != "All":
                    status_param = status_filter.lower().replace(" ", "_")
                
                # Make API call to get questions
                endpoint = f"get_questions/{project_id}"
                if status_param:
                    endpoint += f"?status={status_param}"
                
                with hc.HyLoader('Loading questions...', 
                              hc.Loaders.standard_loaders, 
                              index=2):
                    response = api_request(endpoint)
                
                if response and response.get("status") == "success":
                    questions = response.get('questions', [])
                    
                    if not questions and status_filter == "All":
                        hc.info_card(title='No Questions Found', 
                                    content='No questions found for this project.', 
                                    sentiment='warning',
                                    bar_value=100)
                        
                        # Generate questions button
                        col1, col2, col3 = st.columns([1, 2, 1])
                        with col2:
                            gen_questions_btn = st.button(
                                "Generate Questions for This Project", 
                                key="gen_questions_project_btn",
                                use_container_width=True
                            )
                        
                        if gen_questions_btn:
                            with hc.HyLoader('Generating questions based on SOW analysis...', 
                                         hc.Loaders.standard_loaders, 
                                         index=1):
                                # Make API call to generate questions directly
                                data = {
                                    "project_id": project_id
                                }
                                
                                response = api_request("generate_questions_by_id", method="POST", data=data)
                                
                                if response and response.get("status") == "success":
                                    # Already made the API call above to generate questions directly
                                    
                                    # Display results from the API call
                                    hc.info_card(title='Success!', 
                                               content=f"Question generation completed successfully! Generated {response.get('initial_questions_count', 0)} questions.", 
                                               sentiment='good',
                                               bar_value=100)
                                    
                                    # Display initial questions
                                    if response.get('questions'):
                                        st.subheader("Generated Questions")
                                        questions_df = pd.DataFrame(response.get('questions'))
                                        st.dataframe(questions_df)
                                        
                                        # Reload the page to see questions (message only)
                                        hc.info_card(title='Next Steps', 
                                                   content="The questions have been generated. You'll see them in the list after refreshing.", 
                                                   sentiment='neutral',
                                                   bar_value=75)
                                else:
                                    hc.info_card(title='Error', 
                                               content="Failed to generate questions.", 
                                               sentiment='negative',
                                               bar_value=100)
                                    if response:
                                        st.json(response)
                    elif not questions:
                        hc.info_card(title='No Questions', 
                                    content='No questions found with the selected filter.', 
                                    sentiment='neutral',
                                    bar_value=100)
                    else:
                        # Prepare data for display
                        display_data = []
                        for q in questions:
                            answer_text = ""
                            if 'answer' in q:
                                answer_text = q['answer'].get('answer_text', '')
                            
                            status_display = q.get('status', '')
                            status_icon = "❓"
                            if status_display == 'unanswered':
                                status_icon = "🔴"
                                status_display = f"<span class='status-unanswered'>⚠️ Unanswered</span>"
                            elif status_display == 'partially_answered':
                                status_icon = "🟠"
                                status_display = f"<span class='status-partially'>⚠️ Partially Answered</span>"
                            elif status_display == 'answered':
                                status_icon = "🟢"
                                status_display = f"<span class='status-answered'>✅ Answered</span>"
                            
                            display_data.append({
                                'ID': q.get('id'),
                                'Question': q.get('question'),
                                'Status': status_display,
                                'Status_Icon': status_icon,
                                'Priority': q.get('priority'),
                                'Source': q.get('source'),
                                'Answer': answer_text
                            })
                        
                        # Display as dataframe
                        st.markdown("### Questions")
                        questions_df = pd.DataFrame(display_data)
                        
                        # Create a nice table with Hydralit components
                        question_table_data = [{
                            'ID': q['ID'],
                            'Question': q['Question'],
                            'Status': q['Status_Icon'],
                            'Priority': '⭐' * int(q['Priority']) if isinstance(q['Priority'], (int, float)) else q['Priority'],
                            'Source': q['Source'][:30] + '...' if isinstance(q['Source'], str) and len(q['Source']) > 30 else q['Source'],
                        } for q in display_data]
                        
                        hc.aggrid_interactive_table(df=pd.DataFrame(question_table_data),
                                                   columns_auto_size_mode=2,
                                                   theme='material',
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
                            with hc.box(border_shadow=True, shadow=True, width=100, height=None):
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

# Define the Discovery Status page
@app.addapp(title='Discovery Status', icon="📊")
def discovery_status():
    # Show a notification alert at the top with app info
    hc.info_card(title='Discovery Status Dashboard', 
                content='Check the current status of the discovery process', 
                sentiment='good',
                bar_value=100)
    
    colored_header(
        label="Discovery Status Dashboard",
        description="Check the current status of the discovery process",
        color_name="green-70"
    )

    with hc.box(border_shadow=True, shadow=True, width=100):
        # Get available projects
        projects = get_projects()
        
        if not projects:
            hc.info_card(title='No Projects Found', 
                        content='Please start a discovery process first.', 
                        sentiment='warning',
                        bar_value=100)
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
                with hc.HyLoader('Loading discovery status...', 
                              hc.Loaders.standard_loaders, 
                              index=2):
                    response = api_request(f"discovery_status/{project_id}")
                
                if response and response.get("status") == "success":
                    status = response.get('discovery_status', {})
                    
                    # Display stats
                    st.subheader("Discovery Progress")
                    
                    # Create metrics cards with Hydralit components
                    metric_row1 = [
                        {"label": "Total Questions", "value": status.get('total_questions', 0)},
                        {"label": "Answered Questions", "value": status.get('question_status', {}).get('answered', 0)},
                        {"label": "Partially Answered", "value": status.get('question_status', {}).get('partially_answered', 0)},
                        {"label": "Unanswered", "value": status.get('question_status', {}).get('unanswered', 0)}
                    ]
                    
                    hc.metric_row(metric_row1)
                    
                    # Display pie chart
                    st.pyplot(create_progress_chart(status))
                    
                    # Display completion status
                    completion_status = status.get('discovery_complete', False)
                    if completion_status:
                        hc.info_card(title='Discovery Status', 
                                   content='✅ Discovery Process Complete', 
                                   sentiment='good',
                                   bar_value=100)
                    else:
                        hc.info_card(title='Discovery Status', 
                                   content='🔄 Discovery Process In Progress', 
                                   sentiment='warning',
                                   bar_value=60)
                        
                        # Calculate completion percentage
                        total = status.get('total_questions', 0)
                        unanswered = status.get('question_status', {}).get('unanswered', 0)
                        partially = status.get('question_status', {}).get('partially_answered', 0)
                        
                        if total > 0:
                            completion_pct = 100 - ((unanswered + partially / 2) / total * 100)
                            
                            # Create a styled progress bar with Hydralit components
                            hc.progress_bar(
                                progress_value=min(int(completion_pct), 100),
                                label=f"Estimated completion: {completion_pct:.1f}%",
                                override_theme={"progress_text": "#4CAF50", "progress_outline": "#ddd", "progress_fill": "#4CAF50"}
                            )
                    
                    # Transcript count
                    colored_header("Transcripts Processed", "", "green-50")
                    
                    with hc.box(border_shadow=True, shadow=True, width=100, height=None):
                        hc.metric_card(
                            title="Total Transcripts",
                            content=status.get('transcript_count', 0),
                            description=f"{status.get('transcript_count', 0)} meeting transcripts have been processed",
                            sentiment='good' if status.get('transcript_count', 0) > 0 else 'neutral',
                            key="transcript_count"
                        )
                    
                    # Links to other sections
                    add_vertical_space(2)
                    
                    nav_grid = [
                        {'name': 'View Questions', 'icon': 'bi bi-question-circle', 'id': 'view_questions', 'ttip': 'Go to View Questions to manage questions', 'func': ''},
                        {'name': 'Process Transcripts', 'icon': 'bi bi-mic', 'id': 'process_transcripts', 'ttip': 'Go to Process Transcripts to add more transcript data', 'func': ''},
                    ]
                    
                    # Create a nice navigation menu that allows switching between tabs
                    hc.nav_bar(
                        menu_definition=nav_grid,
                        home_name='View Questions',
                        first_select=0,
                        override_theme={'txc_inactive': 'white','menu_background':'#4CAF50','txc_active':'white','option_active':'#2c3e50'}
                    )
# Define the Reports page
@app.addapp(title='Reports', icon="📄")
def reports():
    # Show a notification alert at the top with app info
    hc.info_card(title='Discovery Reports', 
                content='Generate comprehensive reports about the discovery process', 
                sentiment='good',
                bar_value=100)
    
    colored_header(
        label="Discovery Reports",
        description="Generate comprehensive reports about the discovery process",
        color_name="green-70"
    )

    with hc.box(border_shadow=True, shadow=True, width=100, height=None):
        # Get available projects
        projects = get_projects()
        
        if not projects:
            hc.info_card(title='No Projects Found', 
                        content='Please start a discovery process first.', 
                        sentiment='warning',
                        bar_value=100)
        else:
            # Select project
            selected_project = st.selectbox("Select Project", projects)
            
            # Get project ID
            project_id = None
            for i, project in enumerate(projects):
                if project == selected_project:
                    project_id = i + 1  # Simple assumption that project IDs start from 1
            
            if project_id:
                # Generate report button
                col1, col2, col3 = st.columns([1, 2, 1])
                with col2:
                    generate_report_btn = st.button(
                        "Generate Comprehensive Report", 
                        use_container_width=True
                    )
                
                if generate_report_btn:
                    with hc.HyLoader('Generating comprehensive report...', 
                                   hc.Loaders.standard_loaders, 
                                   index=1):
                        # Get discovery report
                        response = api_request(f"discovery_report/{project_id}")
                        
                        if response and response.get("status") == "success":
                            # Display report
                            hc.info_card(title='Success!', 
                                       content='Report generated successfully', 
                                       sentiment='good',
                                       bar_value=100)
                            
                            # Project info
                            colored_header("Project Information", "", "green-50")
                            project_info = response.get('project', {})
                            
                            with hc.box(border_shadow=True, shadow=True, width=100, height=None):
                                col1, col2 = st.columns(2)
                                with col1:
                                    st.markdown(f"**Project Name:** {project_info.get('name', 'Unknown')}")
                                with col2:
                                    st.markdown(f"**Created:** {project_info.get('created_at', 'Unknown')}")
                            
                            # SOW Summary
                            colored_header("SOW Summary", "", "green-50")
                            sow_summary = response.get('sow_summary', {})
                            
                            # Use Hydralit metrics row
                            metric_row2 = [
                                {"label": "Sections", "value": sow_summary.get('sections_count', 0)},
                                {"label": "Requirements", "value": sow_summary.get('requirements_count', 0)},
                                {"label": "In-Scope Items", "value": sow_summary.get('in_scope_items', 0)},
                                {"label": "Out-of-Scope Items", "value": sow_summary.get('out_of_scope_items', 0)},
                                {"label": "Unclear Items", "value": sow_summary.get('unclear_items', 0)}
                            ]
                            
                            hc.metric_row(metric_row2)
                            
                            # Question stats
                            colored_header("Question Statistics", "", "green-50")
                            question_stats = response.get('questions', {})
                            
                            with hc.box(border_shadow=True, shadow=True, width=100, height=None):
                                hc.metric_card(
                                    title="Total Questions",
                                    content=question_stats.get('total', 0),
                                    description=f"{question_stats.get('total', 0)} questions generated for this project",
                                    sentiment='good' if question_stats.get('total', 0) > 0 else 'neutral',
                                    key="total_questions"
                                )
                                
                                # Status breakdown
                                st.write("**Questions by Status:**")
                                status_counts = question_stats.get('by_status', {})
                                status_df = pd.DataFrame([
                                    {"Status": status, "Count": count}
                                    for status, count in status_counts.items()
                                ])
                                
                                if not status_df.empty:
                                    # Create a nice bar chart with Hydralit
                                    st.bar_chart(status_df.set_index("Status"))
                            
                            # Transcript summary
                            colored_header("Transcript Summary", "", "green-50")
                            transcript_info = response.get('transcripts', {})
                            
                            with hc.box(border_shadow=True, shadow=True, width=100, height=None):
                                hc.metric_card(
                                    title="Total Transcripts",
                                    content=transcript_info.get('count', 0),
                                    description=f"{transcript_info.get('count', 0)} meeting transcripts have been processed",
                                    sentiment='good' if transcript_info.get('count', 0) > 0 else 'neutral',
                                    key="transcript_count_report"
                                )
                                
                                if transcript_info.get('details'):
                                    st.write("**Transcript Details:**")
                                    transcript_df = pd.DataFrame([
                                        {
                                            "Date": t.get('meeting_date', 'Unknown'),
                                            "Length (chars)": len(t.get('transcript_text', '')),
                                            "Processed": "Yes" if t.get('processed', False) else "No"
                                        }
                                        for t in transcript_info.get('details', [])
                                    ])
                                    
                                    # Use Hydralit table for better styling
                                    hc.aggrid_interactive_table(df=transcript_df, 
                                                              theme='material',
                                                              height=300)
                            
                            # New information
                            colored_header("New Information Identified", "", "green-50")
                            new_info = response.get('new_information', [])
                            
                            with hc.box(border_shadow=True, shadow=True, width=100, height=None):
                                if new_info:
                                    new_info_df = pd.DataFrame([
                                        {
                                            "Topic": item.get('topic', 'Unknown'),
                                            "Impact": item.get('impact', 'Unknown'),
                                            "Priority": item.get('priority', 'Unknown'),
                                            "Status": item.get('status', 'Unknown')
                                        }
                                        for item in new_info
                                    ])
                                    
                                    # Use Hydralit table for better styling
                                    hc.aggrid_interactive_table(df=new_info_df, 
                                                              theme='material',
                                                              height=300)
                                else:
                                    st.info("No new information identified.")
                            
                            # Completion status
                            colored_header("Discovery Status", "", "green-50")
                            discovery_status = response.get('discovery_status', {})
                            
                            with hc.box(border_shadow=True, shadow=True, width=100, height=None):
                                if discovery_status.get('discovery_complete', False):
                                    hc.info_card(title='Discovery Status', 
                                              content='✅ Discovery Process Complete', 
                                              sentiment='good',
                                              bar_value=100)
                                else:
                                    hc.info_card(title='Discovery Status', 
                                              content='🔄 Discovery Process In Progress', 
                                              sentiment='warning',
                                              bar_value=60)
                            
                            # Export options
                            colored_header("Export Report", "", "green-50")
                            
                            # Create JSON for download
                            report_json = json.dumps(response, indent=2)
                            col1, col2, col3 = st.columns([1, 2, 1])
                            with col2:
                                st.download_button(
                                    "📥 Download Full Report (JSON)",
                                    report_json,
                                    f"{selected_project}_report.json",
                                    "application/json",
                                    use_container_width=True
                                )
                        else:
                            hc.info_card(title='Error', 
                                       content='Failed to generate report.', 
                                       sentiment='negative',
                                       bar_value=100)

# Create a fancy splash screen
def load_splash_screen():
    # Fancy Hydralit splash animation
    over_theme = {'txc_inactive': 'white', 'menu_background': '#2c3e50', 'txc_active': 'white',
                 'option_active': '#4CAF50'}
    
    # Create a nice centered splash screen
    col1, col2, col3 = st.columns([1, 3, 1])
    with col2:
        hc.info_card(title='Welcome to Discovery Accelerator', 
                  content='Streamlining discovery processes for service-based companies', 
                  sentiment='good',
                  bar_value=100)
        
        # Add version info
        st.markdown("<div style='text-align: center; color: gray;'>Version 1.0 - Hydralit Enhanced</div>", unsafe_allow_html=True)
        
        # Add a loading animation
        with hc.HyLoader('Loading Discovery Accelerator', 
                       hc.Loaders.pulse_bars):
            time.sleep(2)

# Add a login page (can be expanded with real auth later)
@app.addapp(is_home=True, title='Login', icon="🔐")
def login():
    hide_logo_check = st.sidebar.checkbox('Hide Logo')
    hide_streamlit_logo = hide_logo_check
    
    if 'authenticated' not in st.session_state or not st.session_state['authenticated']:
        st.session_state['authenticated'] = False
    
    # Custom login form with Hydralit
    with hc.box(border_shadow=True, shadow=True, width=100, height=None):
        colored_header(
            label="Discovery Accelerator Login",
            description="Access the Discovery Accelerator platform",
            color_name="green-70"
        )
        
        # Create a simple login form
        auth_form_container = st.container()
        
        with auth_form_container:
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            
            col1, col2, col3 = st.columns([1, 2, 1])
            
            with col2:
                if st.button("Login", use_container_width=True):
                    # Add simple authentication logic (demo only)
                    if username == "admin" and password == "admin":
                        st.session_state['authenticated'] = True
                        st.success("Login successful!")
                        time.sleep(1)
                        st.experimental_rerun()  # Force UI refresh after login
                    else:
                        hc.info_card(title='Login Failed', 
                                   content='Invalid username or password (use admin/admin for demo)', 
                                   sentiment='negative',
                                   bar_value=100)
    
        # Show a note about demo credentials
        st.markdown("**Demo Credentials:** Username: admin, Password: admin")
    
    # If authenticated, redirect to splash screen then Start Discovery
    if st.session_state['authenticated']:
        # Show splash screen
        load_splash_screen()
        
        # Auto-redirect to Start Discovery page
        app.set_access(0, access=True)  # Enable access to all apps
        
        # Direct user to Start Discovery page 
        app.session_state.selected_app = 'Start Discovery'

# Run the HydraApp
app.add_loader_app(function=load_splash_screen)
app.run()