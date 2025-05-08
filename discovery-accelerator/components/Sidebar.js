'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Rocket, 
  Mic, 
  HelpCircle, 
  Gauge, 
  FileText,
  Settings,
  Users,
  CalendarClock,
  Folder,
  Bell
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const mainNavItems = [
    { name: 'Start Discovery', path: '/start-discovery', icon: <Rocket size={20} /> },
    { name: 'Projects', path: '/projects', icon: <Folder size={20} /> },
    { name: 'Process Transcripts', path: '/process-transcripts', icon: <Mic size={20} /> },
    { name: 'View Questions', path: '/view-questions', icon: <HelpCircle size={20} /> },
    { name: 'Discovery Status', path: '/discovery-status', icon: <Gauge size={20} /> },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} /> },
  ];

  const secondaryNavItems = [
    { name: 'Teams', path: '/teams', icon: <Users size={20} /> },
    { name: 'Schedule', path: '/schedule', icon: <CalendarClock size={20} /> },
    { name: 'Notifications', path: '/notifications', icon: <Bell size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const renderNavItems = (items) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.path;
        return (
          <li key={item.path}>
            <Link 
              href={item.path}
              className={`flex items-center px-3 py-2.5 rounded-md transition-all ${
                isActive
                  ? 'bg-green-100 text-green-700 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
              }`}
            >
              <span className={`mr-3 ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.name}</span>
              
              {/* Active indicator */}
              {isActive && (
                <span className="ml-auto w-1.5 h-5 rounded-full bg-green-500"></span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Main navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-6">
          <h2 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Discovery
          </h2>
          {renderNavItems(mainNavItems)}
        </div>
        
        <div className="mb-6">
          <h2 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings & Administration
          </h2>
          {renderNavItems(secondaryNavItems)}
        </div>
      </div>
      
{/* Footer */}
<div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300">
            <span className="font-semibold text-sm">AC</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Ashwin Choubey</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
          <p>Discovery Accelerator v1.0</p>
          <p className="mt-1">© 2025 Yash Technologies</p>
        </div>
      </div>
    </div>
  );
}