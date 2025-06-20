import React from 'react';
import { TableCellsIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

const ViewModeToggle = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1 space-x-1">
      <button
        onClick={() => onModeChange('classic')}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'classic'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <TableCellsIcon className="h-4 w-4 mr-2" />
        Classic
      </button>
      <button
        onClick={() => onModeChange('excel')}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'excel'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Squares2X2Icon className="h-4 w-4 mr-2" />
        Excel
      </button>
    </div>
  );
};

export default ViewModeToggle;