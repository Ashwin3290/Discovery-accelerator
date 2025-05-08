// route.js
import { NextResponse } from 'next/server';

/**
 * Get discovery status API endpoint
 * This is a proxy to your backend API
 */
export async function GET(request, { params }) {
  try {
    // Get API URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Get project ID from params
    const { projectId } = params;
    
    // Forward the request to the backend API
    const response = await fetch(`${apiUrl}/discovery_status/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('Error in discovery-status API route:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}