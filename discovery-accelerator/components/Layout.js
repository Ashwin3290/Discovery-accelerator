'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Check if we're on mobile and adjust sidebar state accordingly
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Check on initial load
    checkMobile();

    // Add listener for window resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <Navbar toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      {/* Main content area with sidebar */}
      <div className="flex pt-16 min-h-[calc(100vh-64px)]">
        {/* Sidebar - controlled by sidebarOpen state */}
        <div 
          className={`fixed top-16 h-[calc(100vh-64px)] bg-white dark:bg-gray-800 z-20 shadow-md transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'left-0' : '-left-64'
          } lg:left-0`}
          style={{ width: '16rem' }}
        >
          <Sidebar />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main 
          className={`flex-1 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'lg:ml-64' : 'ml-0'
          } p-6 bg-gray-50 dark:bg-gray-900`}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}