'use client';

import { useState, useEffect } from 'react';
import { checkApiHealth } from '../lib/api';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function ApiHealthCheck() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await checkApiHealth();
      setHealth(data);
    } catch (err) {
      console.error('API health check failed:', err);
      setError(err.message || 'Failed to connect to API');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">API Connection</h3>
        <button 
          onClick={checkHealth} 
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          disabled={loading}
          title="Refresh health check"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <RefreshCw size={16} className="animate-spin mr-2" />
          <span className="text-sm">Checking API connection...</span>
        </div>
      ) : error ? (
        <div className="flex items-center text-red-500 dark:text-red-400">
          <XCircle size={16} className="mr-2" />
          <span className="text-sm">Connection error: {error}</span>
        </div>
      ) : health ? (
        <div>
          <div className="flex items-center text-green-500 dark:text-green-400">
            <CheckCircle size={16} className="mr-2" />
            <span className="text-sm">Connected to API (status: {health.status})</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <div><strong>Upload folder:</strong> {health.upload_folder}</div>
            <div><strong>Database path:</strong> {health.chroma_path}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No health information available
        </div>
      )}
    </div>
  );
}