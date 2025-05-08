'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import ColoredHeader from '../../components/ColoredHeader';
import StylableContainer from '../../components/StylableContainer';
import { useTheme } from '../../context/ThemeContext';
import ApiHealthCheck from '../../components/ApiHealthCheck';

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    apiEndpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    autoSave: true,
    exportFormat: 'csv',
    defaultPriority: 'medium'
  });

  const [savedMessage, setSavedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const savedSettings = localStorage.getItem('discoverySettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }
    
    // Get theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setSettings(prev => ({
        ...prev,
        theme: savedTheme
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Apply theme change immediately
    if (name === 'theme') {
      setTheme(value); // This will work for 'light', 'dark', and 'system'
    }
    
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSave = () => {
    setIsLoading(true);
    
    // In a real app, would persist settings to a backend or localStorage
    localStorage.setItem('discoverySettings', JSON.stringify(settings));
    
    // Simulate API call delay
    setTimeout(() => {
      setSavedMessage('Settings saved successfully!');
      setIsLoading(false);
      
      setTimeout(() => {
        setSavedMessage('');
      }, 3000);
    }, 500);
  };

  // Don't render until client-side to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <div className="container mx-auto">
      <ColoredHeader
        label="Application Settings"
        description="Configure your Discovery Accelerator preferences"
        colorName="green-70"
      />

      <StylableContainer>
        <div className="max-w-3xl mx-auto">
          {savedMessage && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 dark:bg-green-900 dark:border-green-800 dark:text-green-200 flex items-center">
              <Check size={18} className="mr-2" />
              {savedMessage}
            </div>
          )}
          
          <div className="space-y-8">
            {/* Appearance Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                Appearance
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Theme
                  </label>
                  <select
                    name="theme"
                    value={settings.theme}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                  </select>
                  <p className="form-hint">
                    Choose how the application looks. System default will follow your device settings.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Notifications Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                Notifications
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifications"
                    name="notifications"
                    checked={settings.notifications}
                    onChange={handleChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Enable notifications
                  </label>
                </div>
                <p className="form-hint mt-1">
                  Receive notifications when questions are answered or transcripts are processed.
                </p>
              </div>
            </div>
            
            {/* API Configuration */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                API Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    name="apiEndpoint"
                    value={settings.apiEndpoint}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="https://api.example.com"
                  />
                  <p className="form-hint">
                    The URL of the backend API service.
                  </p>
                </div>
                
                {/* API Health Check Component */}
                <div className="mt-4">
                  <ApiHealthCheck />
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-900/30 dark:border-yellow-800">
                  <p className="text-yellow-700 dark:text-yellow-200 text-sm">
                    <strong>Note:</strong> Changing the API endpoint may affect connection to the backend services.
                    Only modify this if instructed to do so.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Data Management Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                Data Management
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoSave"
                    name="autoSave"
                    checked={settings.autoSave}
                    onChange={handleChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="autoSave" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Auto-save changes
                  </label>
                </div>
                <p className="form-hint mt-1">
                  Automatically save your work as you make changes.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Export Format
                  </label>
                  <select
                    name="exportFormat"
                    value={settings.exportFormat}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="excel">Excel</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <p className="form-hint">
                    Choose the default format for exporting data from the application.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Question Priority
                  </label>
                  <select
                    name="defaultPriority"
                    value={settings.defaultPriority}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <p className="form-hint">
                    Set the default priority for new discovery questions.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Advanced Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                Advanced Options
              </h2>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4 dark:bg-blue-900/30 dark:border-blue-800">
                <p className="text-blue-700 dark:text-blue-200 text-sm">
                  Reset options will clear your local settings or all application data.
                  Use with caution as these actions cannot be undone.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <button 
                  onClick={() => {
                    if (confirm('Reset all settings to default values?')) {
                      localStorage.removeItem('discoverySettings');
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:ring-offset-gray-900"
                >
                  Reset Settings
                </button>
                
                <button 
                  onClick={() => {
                    if (confirm('Are you sure? This will clear ALL application data and cannot be undone!')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900/70 dark:ring-offset-gray-900"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="btn-primary flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </StylableContainer>
    </div>
  );
}