// route.js
import { NextResponse } from 'next/server';

/**
 * Get questions API endpoint
 * This is a proxy to your backend API
 */
export async function GET(request, { params }) {
  try {
    // Get API URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Get project ID from params
    const { projectId } = params;
    
    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Build API URL with query parameters
    let apiEndpoint = `${apiUrl}/get_questions/${projectId}`;
    if (status) {
      apiEndpoint += `?status=${status}`;
    }
    
    // Forward the request to the backend API
    const response = await fetch(apiEndpoint, {
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
    console.error('Error in questions API route:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}