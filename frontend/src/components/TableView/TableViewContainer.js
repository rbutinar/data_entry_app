import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import ViewModeToggle from './ViewModeToggle';
import ClassicTableView from './ClassicTableView';
import ExcelTableView from './ExcelTableView';

const TableViewContainer = () => {
  // Get table name from URL params
  const { tableName } = useParams();
  const { accounts } = useMsal();
  const navigate = useNavigate();
  
  // State for view mode with persistence
  const [viewMode, setViewMode] = useState(() => {
    // Try to load saved preference from localStorage
    const saved = localStorage.getItem(`tableView_${tableName}_mode`);
    return saved || 'classic';
  });

  // Save mode preference when it changes
  useEffect(() => {
    localStorage.setItem(`tableView_${tableName}_mode`, viewMode);
  }, [viewMode, tableName]);

  // Handle mode change
  const handleModeChange = (newMode) => {
    setViewMode(newMode);
  };

  // If no account is signed in, show sign in message
  if (!accounts || accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Table View</h1>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Back to Dashboard
            </button>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 text-xl mb-4">Access Denied</div>
            <p className="text-gray-500">
              You don't have permission to access this table.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with navigation and view toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/')}
            className="mr-4 flex items-center text-primary-600 hover:text-primary-800"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{tableName}</h1>
        </div>
        
        {/* View Mode Toggle */}
        <ViewModeToggle 
          currentMode={viewMode}
          onModeChange={handleModeChange}
        />
      </div>
      
      {/* Render appropriate view based on mode */}
      {viewMode === 'classic' ? (
        <ClassicTableView tableName={tableName} />
      ) : (
        <ExcelTableView tableName={tableName} />
      )}
    </div>
  );
};

export default TableViewContainer;