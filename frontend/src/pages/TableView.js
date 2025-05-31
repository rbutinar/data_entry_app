import React, { useState, useEffect } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { toast } from 'react-hot-toast';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { 
  ChevronLeftIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/apiService';

const TableView = () => {
  // Get table name from URL params
  const { tableName } = useParams();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  
  // State for table data and UI
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalPages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  // New: state for primary key column name
  const [primaryKeyCol, setPrimaryKeyCol] = useState('id');
  const [fieldNames, setFieldNames] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  // Fetch table metadata to get primary key column
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!accounts || accounts.length === 0) return;
      try {
        const meta = await apiService.getTableMetadata(instance, accounts[0], tableName);
        if (meta && meta.columns) {
          const pkCol = meta.columns.find(col => col.primary_key);
          setPrimaryKeyCol(pkCol ? pkCol.name : 'id');
        } else {
          setPrimaryKeyCol('id');
        }
      } catch (err) {
        setPrimaryKeyCol('id');
      }
    };
    fetchMetadata();
  }, [tableName, instance, accounts]);

  const columns = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    const columnHelper = createColumnHelper();

    const tableColumns = Object.keys(firstRow)
      .filter(key => key !== '_tempId')
      .map((key) => {
        return columnHelper.accessor(key, {
          id: key,
          header: key,
          cell: (info) => {
            const value = info.getValue();
            const rowIndex = info.row.index;
            const rowData = data[rowIndex];
            const columnId = info.column.id;

            if (editingRow === rowIndex) {
              return (
                <input
                  type="text"
                  value={editValues[columnId] !== undefined ? editValues[columnId] : (value !== null && value !== undefined ? String(value) : '')}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setEditValues(prev => ({
                      ...prev,
                      [columnId]: newValue
                    }));
                    // Set this as the focused cell when typing
                    setFocusedCell(`${rowIndex}-${columnId}`);
                  }}
                  onFocus={() => {
                    // Track which cell is focused
                    setFocusedCell(`${rowIndex}-${columnId}`);
                  }}
                  onClick={(e) => {
                    // Prevent click from propagating and losing focus
                    e.stopPropagation();
                  }}
                  className="w-full p-1 border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                  autoFocus={focusedCell === `${rowIndex}-${columnId}`}
                />
              );
            }

            return (
              <div className="p-1">
                {value !== null && value !== undefined ? String(value) : ''}
              </div>
            );
          },
        });
      });

    // Add actions column
    tableColumns.push(
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const rowIndex = info.row.index;
          const rowData = data[rowIndex];
          const rowId = rowData[primaryKeyCol] !== undefined ? rowData[primaryKeyCol] : rowData._tempId;

          if (!rowData) {
            return (
              <div className="flex items-center space-x-2">
                <button
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Edit Row"
                  disabled
                >
                  <PencilIcon className="h-5 w-5 opacity-50" />
                </button>
              </div>
            );
          }

          if (editingRow === rowIndex) {
            return (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSaveEdit(rowIndex, rowId)}
                  className="p-1 text-green-600 hover:text-green-800 edit-action-button"
                  title="Save Changes"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleCancelEdit()}
                  className="p-1 text-red-600 hover:text-red-800 edit-action-button"
                  title="Cancel Edit"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            );
          }

          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEditRow(rowIndex, rowData)}
                className="p-1 text-blue-600 hover:text-blue-800"
                title="Edit Row"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteClick(rowId)}
                className="p-1 text-red-600 hover:text-red-800"
                title="Delete Row"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          );
        },
      })
    );

    return tableColumns;
  }, [data, editingRow, editValues, primaryKeyCol]);

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // State for whether the primary key is auto-incrementing
  const [isPkAutoIncrement, setIsPkAutoIncrement] = useState(true);
  
  // Fetch table metadata including primary key information
  const fetchMetadata = async () => {
    if (!accounts || accounts.length === 0) return;
    
    try {
      console.log(`Fetching metadata for table: ${tableName}`);
      const metadata = await apiService.getTableMetadata(instance, accounts[0], tableName);
      console.log('Table metadata:', metadata);
      
      // Extract primary key column name
      if (metadata && metadata.primary_key) {
        console.log(`Setting primary key column to: ${metadata.primary_key}`);
        setPrimaryKeyCol(metadata.primary_key);
        
        // Check if the primary key is auto-incrementing
        if (metadata.is_auto_increment !== undefined) {
          console.log(`Primary key auto-increment: ${metadata.is_auto_increment}`);
          setIsPkAutoIncrement(metadata.is_auto_increment);
        } else {
          // Default to true if not specified
          console.log('Auto-increment info not found, assuming true');
          setIsPkAutoIncrement(true);
        }
        
        // Extract column information for empty tables
        if (metadata.columns && metadata.columns.length > 0) {
          console.log('Extracting column names from metadata for potentially empty table');
          const columnNames = metadata.columns.map(col => col.name);
          console.log('Column names from metadata:', columnNames);
          
          // Only set field names if they're not already set (empty table case)
          if (fieldNames.length === 0) {
            setFieldNames(columnNames);
            setAllFields(columnNames);
          }
        }
      } else {
        // Fallback to 'id' if primary key not found in metadata
        console.log('Primary key not found in metadata, using default: id');
        setPrimaryKeyCol('id');
        setIsPkAutoIncrement(true);
      }
    } catch (err) {
      console.error('Error fetching table metadata:', err);
      // Fallback to 'id' if metadata fetch fails
      setPrimaryKeyCol('id');
      setIsPkAutoIncrement(true);
    }
  };
  
  // Fetch data from API
  const fetchData = async (page = pagination.page, filterParams = null) => {
    if (!accounts || accounts.length === 0) return;
    
    setLoading(true);
    try {
      const response = await apiService.getTableData(
        instance,
        accounts[0],
        tableName,
        page,
        pagination.pageSize,
        filterParams
      );
      
      if (response && response.data) {
        setData(response.data);
        setPagination({
          page: response.page,
          pageSize: response.pageSize,
          totalPages: response.totalPages,
          total: response.total,
        });
        
        // Extract field names for add form
        if (response.data.length > 0) {
          const fields = Object.keys(response.data[0]).filter(
            (field) => field !== '_tempId'
          );
          setFieldNames(fields);
          setAllFields(fields);
        }
        // If we have column information but no data, make sure we fetch metadata
        else if (fieldNames.length === 0) {
          console.log('Table is empty, fetching metadata to get column information');
          fetchMetadata();
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch metadata and data when component mounts or table changes
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      // First fetch metadata to get primary key column
      fetchMetadata().then(() => {
        // Then fetch data
        fetchData();
      });
    }
  }, [accounts, tableName, instance]);
  
  // Track the currently focused cell
  const [focusedCell, setFocusedCell] = useState(null);

  // Handle edit row
  const handleEditRow = (rowIndex, rowData) => {
    setEditingRow(rowIndex);
    setEditValues({});
    // Reset focused cell when starting to edit
    setFocusedCell(null);
  };
  
  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({});
    setFocusedCell(null);
  };
  
  // Handle saving edit
  const handleSaveEdit = async (rowIndex, rowId) => {
    if (!accounts || accounts.length === 0) return;
    
    const rowData = data[rowIndex];
    const updatedData = { ...rowData };
    
    // Apply edits
    Object.keys(editValues).forEach((key) => {
      updatedData[key] = editValues[key];
    });
    
    try {
      await apiService.updateRow(
        instance,
        accounts[0],
        tableName,
        rowId,
        updatedData,
        primaryKeyCol
      );
      
      // Update local data
      const newData = [...data];
      newData[rowIndex] = updatedData;
      setData(newData);
      
      toast.success('Row updated successfully');
      setEditingRow(null);
      setEditValues({});
      setFocusedCell(null);
    } catch (err) {
      console.error('Error updating row:', err);
      toast.error('Failed to update row. Please try again.');
    }
  };
  
  // Handle adding a new row
  const handleAddRow = async () => {
    if (!accounts || accounts.length === 0) return;
    
    try {
      console.log(`Adding new row to table: ${tableName} with primary key column: ${primaryKeyCol}`);
      console.log(`Primary key auto-increment: ${isPkAutoIncrement}`);
      console.log('New row data before processing:', newRowData);
      
      // Validate primary key for non-auto-incrementing tables
      if (!isPkAutoIncrement && (!newRowData[primaryKeyCol] || newRowData[primaryKeyCol] === '')) {
        console.error(`Primary key value is required for non-auto-incrementing column ${primaryKeyCol}`);
        toast.error('Primary key value is required for this table');
        return;
      }
      
      // Prepare data - remove id if it's empty (for auto-increment)
      const rowToAdd = { ...newRowData };
      if (isPkAutoIncrement && (!rowToAdd[primaryKeyCol] || rowToAdd[primaryKeyCol] === '')) {
        console.log(`Removing empty primary key ${primaryKeyCol} for auto-increment`);
        delete rowToAdd[primaryKeyCol];
      }
      
      console.log('Row data after processing:', rowToAdd);
      
      // Add temporary ID for optimistic UI update
      const tempId = `temp-${Date.now()}`;
      const tempRow = { ...rowToAdd, _tempId: tempId };
      
      // Optimistic update
      setData([tempRow, ...data]);
      
      // Send to API
      const response = await apiService.insertRow(
        instance,
        accounts[0],
        tableName,
        rowToAdd,
        primaryKeyCol
      );
      
      // Replace temp row with actual row from response
      if (response) {
        console.log('Insert row response:', response);
        // Create a new row object with the returned primary key value
        const newRow = { ...rowToAdd };
        
        let pkValueFound = false;
        
        // Handle both formats: response.id or response[primaryKeyCol]
        if (response[primaryKeyCol] !== undefined) {
          console.log(`Found primary key ${primaryKeyCol} in response with value:`, response[primaryKeyCol]);
          newRow[primaryKeyCol] = response[primaryKeyCol];
          pkValueFound = true;
        } else if (response.id !== undefined) {
          console.log(`Found 'id' in response with value:`, response.id);
          newRow[primaryKeyCol] = response.id;
          pkValueFound = true;
        } else if (response.success && response[primaryKeyCol] !== undefined) {
          // Handle debug endpoint response format
          console.log(`Found primary key ${primaryKeyCol} in success response with value:`, response[primaryKeyCol]);
          newRow[primaryKeyCol] = response[primaryKeyCol];
          pkValueFound = true;
        }
        
        // For non-auto-incrementing primary keys, use the value we sent
        if (!isPkAutoIncrement && !pkValueFound && newRowData[primaryKeyCol]) {
          console.log(`Using provided primary key for non-auto-incrementing column:`, newRowData[primaryKeyCol]);
          newRow[primaryKeyCol] = newRowData[primaryKeyCol];
          pkValueFound = true;
        }
        
        // Copy any other fields from the response that might have been modified by the server
        for (const key in response) {
          if (key !== 'success' && key !== 'message' && key !== primaryKeyCol) {
            newRow[key] = response[key];
          }
        }
        
        console.log('Final new row data to display:', newRow);
        
        const newData = data.map((row) => 
          row._tempId === tempId ? { ...newRow, _tempId: undefined } : row
        );
        setData(newData);
      }
      
      // Reset form
      setNewRowData({});
      setShowAddForm(false);
      toast.success('Row added successfully');
      
      // Always refresh data from server to ensure UI is up-to-date
      console.log('Refreshing data from server after adding row');
      fetchData();
    } catch (err) {
      console.error('Error adding row:', err);
      toast.error('Failed to add row. Please try again.');
      
      // Remove temp row on error
      setData(data.filter((row) => !row._tempId));
    }
  };

  // Show confirmation dialog before deleting a row
  const handleDeleteClick = (rowId) => {
    setRowToDelete(rowId);
    setConfirmOpen(true);
  };

  // Robust error handling for deleting a row
  const handleDeleteRow = async (rowId) => {
    setConfirmOpen(false);
    
    if (!rowId || !accounts || accounts.length === 0) return;
    
    try {
      // Optimistic UI update - remove row from UI immediately
      const newData = data.filter(row => row[primaryKeyCol] !== rowId);
      setData(newData);
      
      // Call API to delete row
      await apiService.deleteRow(instance, accounts[0], tableName, rowId, primaryKeyCol);
      
      toast.success('Row deleted successfully');
    } catch (err) {
      console.error('Error deleting row:', err);
      toast.error('Failed to delete row. Please try again.');
      
      // Revert optimistic update on error
      fetchData();
    }
  };
  
  // Handle change in new row form
  const handleNewRowChange = (columnId, value) => {
    console.log(`Updating new row data for column: ${columnId} with value: ${value}`);
    console.log(`Is primary key column: ${columnId === primaryKeyCol}`);
    
    // If this is the primary key column, handle it based on whether it's auto-incrementing
    if (columnId === primaryKeyCol) {
      if (isPkAutoIncrement && (value === '' || value === undefined)) {
        console.log('Auto-incrementing primary key with empty value - will be auto-generated by backend');
      } else if (!isPkAutoIncrement && (value === '' || value === undefined)) {
        console.log('Non-auto-incrementing primary key requires a value');
      }
    }
    
    setNewRowData((prev) => {
      const updated = {
        ...prev,
        [columnId]: value,
      };
      console.log('Updated new row data:', updated);
      return updated;
    });
  };
  
  // Handle filter submission
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchData(1, { column: filterColumn, value: filterValue });
  };
  
  // Handle filter reset
  const handleFilterReset = () => {
    setFilterColumn('');
    setFilterValue('');
    fetchData(1);
  };
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchData(newPage);
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
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="mr-4 flex items-center text-primary-600 hover:text-primary-800"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{tableName}</h1>
      </div>
      
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : null}
      
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filter Data</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            {showAddForm ? 'Cancel' : 'Add New Row'}
          </button>
        </div>
        
        {showAddForm && (
          <div className="mb-6 p-4 border border-green-200 bg-green-50 rounded-lg">
            <h3 className="text-lg font-medium text-green-800 mb-4">Add New Row</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {allFields.map(field => (
                <div key={field} className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field} {field === primaryKeyCol && (
                      <span className="text-xs text-gray-500">
                        ({isPkAutoIncrement ? 'auto-generated' : 'required'})
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={newRowData[field] || ''}
                    onChange={e => handleNewRowChange(field, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={field === primaryKeyCol ? 
                      (isPkAutoIncrement ? 'Auto-generated' : 'Enter primary key value') : 
                      `Enter ${field}`
                    }
                    disabled={field === primaryKeyCol && isPkAutoIncrement}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddRow}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Save New Row
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select column</option>
              {columns
                .filter(col => col.id !== 'actions')
                .map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.id}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Filter value"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              disabled={!filterColumn || !filterValue}
            >
              <MagnifyingGlassIcon className="h-5 w-5 inline mr-1" />
              Filter
            </button>
            
            <button
              type="button"
              onClick={handleFilterReset}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Table Data</h2>
          <div className="flex items-center">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-2">
              Click Edit button to modify rows
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-4 text-center">No data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {data.length === 0 ? (
                    'No results to display'
                  ) : (
                    <>
                      Showing <span className="font-medium">1</span> to{' '}
                      <span className="font-medium">{data.length}</span>{' '}
                      of <span className="font-medium">{data.length}</span> results
                    </>
                  )}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show current page, first and last page, and pages around current page
                      return (
                        page === 1 ||
                        page === pagination.totalPages ||
                        Math.abs(page - pagination.page) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there are gaps
                      const prevPage = array[index - 1];
                      const showEllipsisBefore = prevPage && prevPage !== page - 1;
                      
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border ${pagination.page === page ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'} text-sm font-medium`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronLeftIcon className="h-5 w-5 transform rotate-180" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* ConfirmDialog for delete confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Row"
        message="Are you sure you want to delete this row?"
        onConfirm={() => handleDeleteRow(rowToDelete)}
        onCancel={() => {
          setConfirmOpen(false);
          setRowToDelete(null);
        }}
      />
    </div>
  );
};

export default TableView;
