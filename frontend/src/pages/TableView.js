import React, { useState, useEffect } from 'react';
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
  const [columns, setColumns] = useState([]);
const [fieldNames, setFieldNames] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  
  // Fetch table data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.pageSize,
      };
      
      if (filterColumn && filterValue) {
        params.filter_column = filterColumn;
        params.filter_value = filterValue;
      }
      
      const response = await apiService.getTableData(
        instance,
        accounts[0],
        tableName,
        params
      );
      
      // Process data to ensure each row has a unique identifier
      let processedData = [];
      if (response.data && response.data.length > 0) {
        processedData = response.data.map((row, index) => {
          // If the row doesn't have an id, add a temporary one based on the index
          if (row.id === undefined) {
            return { ...row, _tempId: `temp-${index}` };
          }
          return row;
        });
      }
      
      setData(processedData);
      setPagination({
        ...pagination,
        total: response.total || 0,
        totalPages: response.total_pages || 0,
      });
      
      // Dynamically create columns from the first row
      if (response.data && response.data.length > 0) {
        const firstRow = response.data[0];
        setFieldNames(Object.keys(firstRow).filter(key => key !== '_tempId' && key !== 'id'));
        const columnHelper = createColumnHelper();
        
        // Create columns for data fields
        const tableColumns = Object.keys(firstRow)
          .filter(key => key !== '_tempId')
          .map((key) => {
            return columnHelper.accessor(key, {
              header: key,
              cell: (info) => {
                const value = info.getValue();
                const rowIndex = info.row.index;
                const rowData = data[rowIndex];
                const columnId = info.column.id;
                
                // Check if this row is being edited
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
                      }}
                      className="w-full p-1 border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      autoFocus={columnId === Object.keys(rowData).filter(k => k !== 'id' && k !== '_tempId')[0]}
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
              
              // Check if rowData exists
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
              
              // Use either the real ID or the temporary ID
              const rowId = rowData.id !== undefined ? rowData.id : rowData._tempId;
              
              // If this row is being edited, show save/cancel buttons
              if (editingRow === rowIndex) {
                return (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSaveEdit(rowIndex, rowId)}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Save Changes"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleCancelEdit()}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Cancel Edit"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                );
              }
              
              // Otherwise show edit/delete buttons
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
                    onClick={() => handleDeleteRow(rowId)}
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
        
        setColumns(tableColumns);
      }
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      fetchData();
    }
  }, [tableName, pagination.page, pagination.pageSize, instance, accounts]);
  
  // Handle editing a row
  // Replace any calls to handleDeleteRow in JSX or actions to use the new robust version above.

  const handleEditRow = (rowIndex, rowData) => {
    // Initialize edit values with current row data
    const initialEditValues = {};
    Object.keys(rowData).forEach(key => {
      if (key !== 'id' && key !== '_tempId') {
        initialEditValues[key] = rowData[key] !== null && rowData[key] !== undefined ? String(rowData[key]) : '';
      }
    });
    
    setEditValues(initialEditValues);
    setEditingRow(rowIndex);
  };
  
  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({});
  };
  
  // Handle saving edit
  const handleSaveEdit = async (rowIndex, rowId) => {
    try {
      // Check if any values have changed
      const rowData = data[rowIndex];
      const updates = {};
      let hasChanges = false;
      
      Object.keys(editValues).forEach(key => {
        const originalValue = rowData[key] !== null && rowData[key] !== undefined ? String(rowData[key]) : '';
        if (editValues[key] !== originalValue) {
          updates[key] = editValues[key];
          hasChanges = true;
        }
      });
      
      if (!hasChanges) {
        toast.info('No changes to save');
        setEditingRow(null);
        setEditValues({});
        return;
      }
      
      // If it's a temporary ID, show a warning
      if (rowId && rowId.toString().startsWith('temp-')) {
        toast.warning('This row may not have a real ID in the database. Changes might not be saved correctly.');
      }
      
      toast.loading('Saving changes...');
      await apiService.updateRow(instance, accounts[0], tableName, rowId, updates);
      
      // Update local data
      const newData = [...data];
      newData[rowIndex] = {
        ...newData[rowIndex],
        ...updates
      };
      setData(newData);
      
      toast.dismiss();
      toast.success('Changes saved successfully');
      
      // Exit edit mode
      setEditingRow(null);
      setEditValues({});
    } catch (err) {
      console.error('Error saving changes:', err);
      toast.dismiss();
      toast.error(`Failed to save changes: ${err.message}`);
    }
  };
  
  // Handle adding a new row
  const handleAddRow = async () => {
    try {
      // Check if newRowData has any values
      if (Object.keys(newRowData).length === 0) {
        toast.error('Please fill in at least one field');
        return;
      }
      
      console.log('Adding new row with data:', newRowData);
      toast.loading('Adding new row...');
      
      const result = await apiService.insertRow(instance, accounts[0], tableName, newRowData);
      console.log('Insert result:', result);
      
      // Check if result contains a success indicator or the inserted row
      if (!result || (Array.isArray(result) && result.length === 0) || (result.success === false)) {
        toast.dismiss();
        toast.error('Backend did not return a successful insert. Check backend logs for details.');
        console.error('Insert failed or returned unexpected result:', result);
        return;
      }
      
      // Refresh data to show the new row
      await fetchData();
      
      // Reset form
      setShowAddForm(false);
      setNewRowData({});
      
      toast.dismiss();
      toast.success('New row added successfully');
    } catch (err) {
      console.error('Error adding row:', err);
      toast.dismiss();
      toast.error(`Failed to add row: ${err.message}`);
    }
  };

  // Robust error handling for deleting a row
  const handleDeleteRow = async (rowId) => {
    try {
      toast.loading('Deleting row...');
      const result = await apiService.deleteRow(instance, accounts[0], tableName, rowId);
      console.log('Delete result:', result);
      if (!result || (result.success === false)) {
        toast.dismiss();
        toast.error('Backend did not confirm deletion. Check backend logs for details.');
        console.error('Delete failed or returned unexpected result:', result);
        return;
      }
      await fetchData();
      toast.dismiss();
      toast.success('Row deleted successfully');
    } catch (err) {
      console.error('Error deleting row:', err);
      toast.dismiss();
      toast.error(`Failed to delete row: ${err.message}`);
    }
  };

  
  // Handle change in new row form
  const handleNewRowChange = (columnId, value) => {
    setNewRowData(prev => {
      const newData = { ...prev };
      newData[columnId] = value;
      return newData;
    });
  };
  
  // Handle filter submission
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };
  
  // Handle filter reset
  const handleFilterReset = () => {
    setFilterColumn('');
    setFilterValue('');
    // Reset to first page when clearing filters
    setPagination({
      ...pagination,
      page: 1
    });
    // Fetch data without filters
    fetchData();
  };
  
  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    setPagination({
      ...pagination,
      page: newPage
    });
  };

  // If no account is signed in, show sign in message
  if (!accounts || accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="mb-4">Please sign in to view table data.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If there's an access denied error
  if (error && error.includes('access')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="mr-4 flex items-center text-primary-600 hover:text-primary-800"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
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
              {fieldNames.map(field => (
                <div key={field} className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field}
                  </label>
                  <input
                    type="text"
                    value={newRowData[field] || ''}
                    onChange={e => handleNewRowChange(field, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={`Enter ${field}`}
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
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
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
    </div>
  );
};

export default TableView;
