import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ChevronLeftIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const ExcelGridTable = ({
  data,
  columnDefs,
  tableName,
  onCellValueChanged,
  onSelectionChanged,
  onAddRow,
  onDeleteSelected,
  onNavigateBack,
  onFilterChanged,
  primaryKeyCol = 'id',
  noPrimaryKey = false,
  loading = false,
  error = null
}) => {
  // State for filter
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [gridKey, setGridKey] = useState(1); // Add state for gridKey
  
  // State for cell editing
  const [editCell, setEditCell] = useState(null); // {rowIndex, field, value}
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);
  
  // Default pagination state for our basic table implementation
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: data?.length || 0,
    totalPages: Math.ceil((data?.length || 0) / 10)
  });
  
  // Update pagination when data changes
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: data?.length || 0,
      totalPages: Math.ceil((data?.length || 0) / prev.pageSize)
    }));
  }, [data]);

  // Default column definition
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 150,
    editable: !noPrimaryKey,
    resizable: true,
    sortable: true,
    filter: true,
    // Excel-like styling
    cellStyle: params => {
      const styles = {};
      
      // Primary key column styling
      if (params.colDef.field === primaryKeyCol) {
        styles.backgroundColor = '#f0f9ff';
        styles.fontWeight = 'bold';
      }
      
      return styles;
    },
    // Better cell editing experience
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  }), [primaryKeyCol, noPrimaryKey]);

  // Initialize table on ready
  const onGridReady = useCallback(() => {
    console.log('ExcelGridTable - Table ready event fired');
    // For our basic table, we don't need to store API references
  }, []);

  // Handle window resize for responsive table
  useEffect(() => {
    const handleResize = () => {
      // For our basic table, we rely on CSS for responsiveness
      console.log('Window resized');
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle filter application
  const applyFilter = useCallback(() => {
    // For our basic table implementation, we'll pass the filter to the parent component
    if (onFilterChanged && filterColumn && filterValue) {
      onFilterChanged({
        column: filterColumn,
        value: filterValue
      });
    }
  }, [filterColumn, filterValue, onFilterChanged]);

  // For our basic table implementation, we don't need complex keyboard shortcuts
  // We'll handle basic navigation in the input field's onKeyDown event

  // Handle row selection in our basic table
  const handleRowSelection = (row, isSelected) => {
    // Update selected rows based on user interaction
    if (isSelected) {
      setSelectedRows(prev => [...prev, row]);
    } else {
      setSelectedRows(prev => prev.filter(r => r !== row));
    }
    
    // Notify parent component about selection change
    if (onSelectionChanged) {
      onSelectionChanged({
        selected: isSelected ? [...selectedRows, row] : selectedRows.filter(r => r !== row)
      });
    }
  };

  // Handle filter changes
  const handleFilterColumnChange = (e) => {
    setFilterColumn(e.target.value);
  };

  const handleFilterValueChange = (e) => {
    setFilterValue(e.target.value);
  };

  const clearFilter = () => {
    setFilterColumn('');
    setFilterValue('');
    // Notify parent component about filter clear
    if (onFilterChanged) {
      onFilterChanged({ column: '', value: '' });
    }
  };
  
  // This is intentionally empty to remove the duplicate applyFilter declaration

  // Handle page change for pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };

  // Log component props on each render
  useEffect(() => {
    console.log('ExcelGridTable - Component rendered');
    console.log('ExcelGridTable - Data:', data);
    console.log('ExcelGridTable - Column definitions:', columnDefs);
    
    // Generate a new key to force table re-render when data or columns change
    setGridKey(prev => prev + 1);
  }, [data, columnDefs]);

  console.log('ExcelGridTable - Rendering with data:', { 
    dataLength: data?.length, 
    colDefsLength: columnDefs?.length,
    gridKey
  });

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => window.history.back()}
              className="mr-2 p-1 rounded hover:bg-gray-200"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold">{tableName}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="border rounded p-2"
            >
              <option value="">Select column...</option>
              {columnDefs?.map(col => (
                <option key={col.field} value={col.field}>
                  {col.headerName}
                </option>
              ))}
            </select>
            
            <div className="relative">
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Filter value..."
                className="border rounded p-2 pl-8"
              />
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-3 text-gray-400" />
            </div>
            
            <button
              onClick={applyFilter}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Apply Filter
            </button>
            
            <button
              onClick={clearFilter}
              className="p-2 border rounded hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onAddRow}
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
              disabled={noPrimaryKey}
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add Row
            </button>
            <button
              onClick={onDeleteSelected}
              className="p-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
              disabled={noPrimaryKey || selectedRows.length === 0}
            >
              <TrashIcon className="h-5 w-5 mr-1" />
              Delete Selected
            </button>
          </div>
        </div>
      </div>
      {/* Only one data summary block, then the table */}
      <div className="mb-4">
        <div className="p-2 bg-gray-100 text-xs text-gray-700 mb-2 rounded">
          <p>Data: {JSON.stringify(data?.slice(0, 1))}...</p>
          <p>Data length: {data?.length || 0}</p>
          <p>Columns: {columnDefs?.length || 0}</p>
        </div>
      </div>
      {/* Basic table implementation as a fallback */}
      <div className="border rounded overflow-auto" style={{ height: '500px' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
            <th className="px-4 py-3"></th> {/* Blank for checkbox column */}
            {columnDefs?.map((col) => (
              <th 
                key={col.field} 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.headerName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data?.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {/* Checkbox for row selection in the first column */}
              <td className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row)}
                  onChange={e => {
                    const isChecked = e.target.checked;
                    setSelectedRows(prev => {
                      if (isChecked) {
                        return [...prev, row];
                      } else {
                        return prev.filter(r => r !== row);
                      }
                    });
                    if (onSelectionChanged) {
                      onSelectionChanged({
                        selected: isChecked ? [...selectedRows, row] : selectedRows.filter(r => r !== row)
                      });
                    }
                  }}
                />
              </td>
              {columnDefs?.map((col) => (
                <td
                  key={`${rowIndex}-${col.field}`}
                  className={`px-6 py-4 whitespace-nowrap text-sm ${col.field === primaryKeyCol ? 'bg-blue-50 font-semibold' : 'text-gray-500'}`}
                  onClick={() => {
                    if (col.field !== primaryKeyCol) {
                      setEditCell({ rowIndex, field: col.field, value: row[col.field] || '' });
                      setEditValue(row[col.field] || '');
                      setTimeout(() => {
                        if (editInputRef.current) {
                          editInputRef.current.focus();
                        }
                      }, 0);
                    }
                  }}
                  style={{ cursor: col.field !== primaryKeyCol ? 'pointer' : 'default' }}
                >
                  {editCell && editCell.rowIndex === rowIndex && editCell.field === col.field ? (
                    <div className="flex items-center">
                      <input
                        ref={editInputRef}
                        type="text"
                        className="border rounded p-1 w-full focus:outline-none focus:ring"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const updatedRow = { ...row, [col.field]: editValue };
                            if (onCellValueChanged) {
                              onCellValueChanged({
                                data: updatedRow,
                                colDef: { field: col.field },
                                newValue: editValue,
                                oldValue: row[col.field]
                              });
                            }
                            setEditCell(null);
                          } else if (e.key === 'Escape') {
                            setEditCell(null);
                          }
                        }}
                        onBlur={() => setEditCell(null)}
                      />
                      <button
                        className="ml-2 text-green-600 hover:text-green-800"
                        onClick={async () => {
                          const oldValue = row[col.field];
                          const newValue = editValue;
                          const rowData = { ...row, [col.field]: editValue };
                          setEditCell(null);
                          const toastId = toast.loading(`Saving change to row ${rowIndex + 1}, column '${col.field}'...`);
                          try {
                            let result;
                            if (onCellValueChanged) {
                              result = onCellValueChanged({
                                data: rowData,
                                colDef: { field: col.field },
                                newValue: editValue,
                                oldValue: row[col.field]
                              });
                              if (result && typeof result.then === 'function') {
                                await result;
                              }
                            }
                            toast.success('Cell updated!', { id: toastId });
                          } catch (err) {
                            toast.error('Failed to update cell', { id: toastId });
                          }
                        }}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>{row[col.field]}</span>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination and summary footer */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={loading || pagination.page <= 1}
            className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-2">
            Page {pagination?.page || 1} of {pagination?.totalPages || 1}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={loading || pagination.page >= pagination.totalPages}
            className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div>
          {loading ? (
            <span>Loading...</span>
          ) : (
            <span>
              {pagination?.total ? `Showing ${((pagination.page - 1) * pagination.pageSize) + 1} to ${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} entries` : 'No data available'}
            </span>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default ExcelGridTable;
