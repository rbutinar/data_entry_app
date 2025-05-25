import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { 
  Bars3Icon, 
  XMarkIcon, 
  TableCellsIcon, 
  UserCircleIcon 
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'visible' : 'invisible'}`} role="dialog" aria-modal="true">
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
          aria-hidden="true" onClick={() => setSidebarOpen(false)}></div>
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition ease-in-out duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-primary-600">Data Entry App</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              <Link
                to="/"
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-primary-600 hover:bg-primary-50"
              >
                <TableCellsIcon className="mr-3 h-6 w-6 text-primary-500" aria-hidden="true" />
                Tables
              </Link>
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex-shrink-0 group block w-full"
            >
              <div className="flex items-center">
                <div>
                  <UserCircleIcon className="inline-block h-10 w-10 rounded-full text-gray-500" />
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                    Logout
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
        
        <div className="flex-shrink-0 w-14" aria-hidden="true">
          {/* Force sidebar to shrink to fit close icon */}
        </div>
      </div>
      
      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-primary-600">Data Entry App</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                <Link
                  to="/"
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-primary-600 hover:bg-primary-50"
                >
                  <TableCellsIcon className="mr-3 h-6 w-6 text-primary-500" aria-hidden="true" />
                  Tables
                </Link>
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="flex-shrink-0 group block w-full"
              >
                <div className="flex items-center">
                  <div>
                    <UserCircleIcon className="inline-block h-9 w-9 rounded-full text-gray-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      Logout
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
