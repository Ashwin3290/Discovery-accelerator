// PDFViewer.js
'use client';

import { useState, useEffect } from 'react';

export default function PDFViewer({ filePath }) {
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        const response = await fetch(filePath);
        
        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onload = () => {
          setPdfData(reader.result);
          setLoading(false);
        };
        
        reader.onerror = () => {
          setError('Error reading the PDF file');
          setLoading(false);
        };
        
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (filePath) {
      fetchPDF();
    }
  }, [filePath]);

  if (loading) {
    return <div className="py-4 text-center">Loading PDF...</div>;
  }

  if (error) {
    return <div className="py-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!pdfData) {
    return <div className="py-4 text-center">No PDF to display</div>;
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-300">
      <iframe 
        src={pdfData}
        className="w-full h-[600px]" 
        title="PDF Viewer"
      />
    </div>
  );
}