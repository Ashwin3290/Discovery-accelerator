// route.js
import { NextResponse } from 'next/server';

/**
 * Process transcript API endpoint
 * This is a proxy to your backend API for processing meeting transcripts
 */
export async function POST(request) {
  try {
    // Get API URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Get request body
    const requestData = await request.json();
    
    // Validate request data
    if (!requestData.project_id) {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Missing project_id in request'
        },
        { status: 400 }
      );
    }
    
    if (!requestData.transcript_text || requestData.transcript_text.trim() === '') {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Missing or empty transcript_text in request'
        },
        { status: 400 }
      );
    }
    
    // Forward the request to the backend API
    const response = await fetch(`${apiUrl}/process_transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      // Get error details from response if possible
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `Backend API error: ${response.status} ${response.statusText}`;
      } catch (e) {
        errorMessage = `Backend API error: ${response.status} ${response.statusText}`;
      }
      
      return NextResponse.json(
        { 
          status: 'error',
          message: errorMessage
        },
        { status: response.status }
      );
    }
    
    // Process successful response
    const data = await response.json();
    
    // Forward the response to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in process-transcript API route:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Unknown error processing transcript'
      },
      { status: 500 }
    );
  }
}