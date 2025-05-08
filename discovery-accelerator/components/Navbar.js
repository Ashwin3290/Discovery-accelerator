// Navbar.js
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  ChevronDown, 
  AlignLeft, 
  Bell, 
  Search, 
  Settings, 
  User,
  HelpCircle,
  LogOut
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  // Navigation items
  const navItems = [
    { name: 'Start Discovery', path: '/start-discovery' },
    { name: 'Process Transcripts', path: '/process-transcripts' },
    { name: 'View Questions', path: '/view-questions' },
    { name: 'Discovery Status', path: '/discovery-status' },
    { name: 'Reports', path: '/reports' },
  ];

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav 
      className={`fixed top-0 w-full z-30 transition-all duration-300 ${
        isScrolled ? 'bg-white dark:bg-gray-800 shadow-md' : 'bg-white dark:bg-gray-800 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center pl-2">
              {/* Yash Technologies logo */}
              <img 
                src="/images/logo.png" 
                alt="Yash Technologies" 
                className="h-12 w-auto mr-3" 
              />
              
              {/* DA logo */}
              <div className="h-9 w-9 bg-green-500 rounded-md flex items-center justify-center text-white font-bold text-xl mr-2">
                DA
              </div>
              
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                Discovery<br />
                Accelerator
              </span>
            </Link>
          </div>

          {/* Middle: Navigation menu */}
          <div className="hidden md:flex md:items-center md:justify-center md:flex-1 mx-6">
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === item.path
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center space-x-2">
            {/* Project dropdown */}
            <div className="relative hidden md:block">
              <button
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-md hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                Projects <ChevronDown className="ml-1 h-4 w-4" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                  <Link
                    href="/start-discovery"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Create New Project
                  </Link>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  <Link
                    href="/projects"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setDropdownOpen(false)}
                  >
                    View All Projects
                  </Link>
                </div>
              )}
            </div>

            {/* Settings quick access */}
            <Link
              href="/settings"
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 focus:outline-none"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                aria-expanded={isOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

{/* Mobile menu */}
<div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-900">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === item.path
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
            >
              {item.name}
            </Link>
          ))}
          
          {/* Projects section in mobile menu */}
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
            <div className="px-2">
              <p className="text-base font-medium text-gray-800 dark:text-gray-200">Projects</p>
              <Link
                href="/start-discovery"
                className="mt-2 block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                Create New Project
              </Link>
              <Link
                href="/projects"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                View All Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}