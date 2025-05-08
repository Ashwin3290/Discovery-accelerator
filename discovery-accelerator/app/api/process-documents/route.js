// route.js
import { NextResponse } from 'next/server';

/**
 * Process documents API endpoint
 * This is a proxy to your backend API
 */
export async function POST(request) {
  try {
    // Get API URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Forward the request to the backend API
    const formData = await request.formData();
    
    const response = await fetch(`${apiUrl}/process_documents`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          status: 'error',
          message: `Backend API error: ${response.status} ${response.statusText}`
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in process-documents API route:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}