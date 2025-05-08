// route.js
import { NextResponse } from 'next/server';

/**
 * Generate questions API endpoint
 * This is a proxy to your backend API
 */
export async function POST(request) {
  try {
    // Get API URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Get request body
    const requestData = await request.json();
    
    // Forward the request to the backend API
    const response = await fetch(`${apiUrl}/generate_questions_by_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
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
    console.error('Error in generate-questions API route:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}