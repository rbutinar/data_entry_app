import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import ExcelGridTable from '../components/ExcelGrid/ExcelGridTable';
import { apiService } from '../services/apiService';

const ExcelTableView = () => {
  // Get table name from URL params
  const { tableName } = useParams();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  
  // State for table data and UI
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [primaryKeyCol, setPrimaryKeyCol] = useState('id');
  const [isPkAutoIncrement, setIsPkAutoIncrement] = useState(true);
  const [fieldNames, setFieldNames] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 50,
    total: 0,
    total_pages: 0,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState(null);
  const [noPrimaryKey, setNoPrimaryKey] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Create column definitions for AG Grid
  const columnDefs = useMemo(() => {
    console.log('ExcelTableView - Creating columnDefs from fieldNames:', fieldNames);
    if (!fieldNames || fieldNames.length === 0) {
      console.log('ExcelTableView - No field names available for columnDefs');
      return [];
    }
    
    // Force a re-render with a timestamp in the console log
    console.log(`ExcelTableView - Building column definitions at ${new Date().toISOString()}`);
    
    return fieldNames.map(field => ({
      field,
      headerName: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
      editable: field !== primaryKeyCol || !isPkAutoIncrement,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 150,
      flex: 1,
      cellStyle: field === primaryKeyCol ? { backgroundColor: '#f0f9ff', fontWeight: 'bold' } : {}
    }));
  }, [fieldNames, primaryKeyCol, isPkAutoIncrement]);

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
          
          // Set field names from metadata
          setFieldNames(columnNames);
          setAllFields(columnNames);
          
          // DEBUGGING: Create test data with these columns
          const testData = [];
          for (let i = 1; i <= 5; i++) {
            const row = {};
            columnNames.forEach(field => {
              if (field === metadata.primary_key) {
                row[field] = i;
              } else if (field.includes('date') || field.includes('time')) {
                row[field] = new Date().toISOString().split('T')[0];
              } else if (field.includes('price') || field.includes('amount')) {
                row[field] = (Math.random() * 100).toFixed(2);
              } else {
                row[field] = `Test ${field} ${i}`;
              }
            });
            testData.push(row);
          }
          
          console.log('ExcelTableView - Setting test data from metadata:', testData);
          setData(testData);
          setPagination({
            page: 1,
            page_size: 50,
            total_pages: 1,
            total: testData.length,
          });
          setLoading(false);
        }
      } else {
        // Fallback to 'id' if primary key not found in metadata
        console.log('Primary key not found in metadata, using default: id');
        setPrimaryKeyCol('id');
        setIsPkAutoIncrement(true);
        setNoPrimaryKey(true);
        
        // Set default field names and test data
        const defaultFields = ['id', 'name', 'description', 'created_at'];
        setFieldNames(defaultFields);
        setAllFields(defaultFields);
        
        // Create test data
        const testData = [];
        for (let i = 1; i <= 5; i++) {
          testData.push({
            id: i,
            name: `Test Name ${i}`,
            description: `Test Description ${i}`,
            created_at: new Date().toISOString().split('T')[0]
          });
        }
        
        console.log('ExcelTableView - Setting default test data:', testData);
        setData(testData);
        setPagination({
          page: 1,
          page_size: 50,
          total_pages: 1,
          total: testData.length,
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching table metadata:', err);
      // Fallback to 'id' if metadata fetch fails
      setPrimaryKeyCol('id');
      setIsPkAutoIncrement(true);
      
      // Set default field names and test data
      const defaultFields = ['id', 'name', 'description', 'created_at'];
      setFieldNames(defaultFields);
      setAllFields(defaultFields);
      
      // Create test data
      const testData = [];
      for (let i = 1; i <= 5; i++) {
        testData.push({
          id: i,
          name: `Test Name ${i}`,
          description: `Test Description ${i}`,
          created_at: new Date().toISOString().split('T')[0]
        });
      }
      
      console.log('ExcelTableView - Setting fallback test data:', testData);
      setData(testData);
      setPagination({
        page: 1,
        page_size: 50,
        total_pages: 1,
        total: testData.length,
      });
      setLoading(false);
    }
  };
  
  // Fetch data from API
  const fetchData = async (page = pagination.page, filterParams = null) => {
    console.log('[DEBUG] fetchData called. page:', page, 'pagination:', pagination, 'filterParams:', filterParams);
    if (!accounts || accounts.length === 0) return;
    if (!accounts || accounts.length === 0) return;
    
    console.log('ExcelTableView - fetchData called with page:', page);
    console.log('ExcelTableView - accounts:', accounts);
    console.log('ExcelTableView - tableName:', tableName);
    
    setLoading(true);
    try {
      // Always build filter params from state unless explicitly provided
      let params = {
        page: page,
        page_size: pagination.page_size,
        filter_column: filterColumn,
        filter_value: filterValue,
        ...filterParams
      };
      console.log('[DEBUG] API params:', params);
      
      const response = await apiService.getTableData(
        instance,
        accounts[0],
        tableName,
        params
      );
      
      console.log('[DEBUG] API response:', response);
      
      // DEBUGGING: If we don't have data from the API, create some test data
      if (!response || !response.data || response.data.length === 0) {
        console.log('ExcelTableView - No data from API, creating test data');
        
        // Create test data based on field names
        const testData = [];
        if (fieldNames.length > 0) {
          // Create 5 sample rows
          for (let i = 1; i <= 5; i++) {
            const row = {};
            fieldNames.forEach(field => {
              if (field === primaryKeyCol) {
                row[field] = i;
              } else if (field.includes('date') || field.includes('time')) {
                row[field] = new Date().toISOString().split('T')[0];
              } else if (field.includes('price') || field.includes('amount')) {
                row[field] = (Math.random() * 100).toFixed(2);
              } else {
                row[field] = `Test ${field} ${i}`;
              }
            });
            testData.push(row);
          }
          
          console.log('ExcelTableView - Created test data:', testData);
          setData(testData);
          setPagination({
            page: 1,
            page_size: 50,
            total_pages: 1,
            total: testData.length,
          });
          setError(null);
          setLoading(false);
          return;
        }
      }
      
      if (response && response.data) {
        console.log('ExcelTableView - Setting data:', response.data);
        setData(response.data);
        setPagination({
          page: response.page,
          page_size: response.page_size || pagination.page_size || 50,
          total_pages: response.total_pages || 0,
          total: response.total || 0,
        });
        
        // Extract field names for add form
        if (response.data.length > 0) {
          const fields = Object.keys(response.data[0]).filter(
            (field) => field !== '_tempId'
          );
          console.log('ExcelTableView - Setting field names:', fields);
          setFieldNames(fields);
          setAllFields(fields);
        }
        // If we have column information but no data, just update state (no metadata fetch)
        else if (fieldNames.length === 0) {
          console.log('Table is empty, but not fetching metadata again.');
        }
      } else {
        console.error('ExcelTableView - No data property in response:', response);
      }
      setError(null);
    } catch (err) {
      console.error('[DEBUG] Error fetching data:', err);
      if (err && err.response) {
        console.error('[DEBUG] Error response:', err.response);
      }
      setError('Failed to load data. Please try again later.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch metadata and data when component mounts or table changes
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      if (accounts && accounts.length > 0) {
        console.log('ExcelTableView - Initial data fetch for table:', tableName);
        try {
          // First fetch metadata
          await fetchMetadata();
          
          // Then fetch data if component is still mounted
          if (isMounted) {
            console.log('ExcelTableView - Fetching data after metadata');
            await fetchData(1);
          }
        } catch (err) {
          console.error('ExcelTableView - Error in initial data fetch:', err);
          if (isMounted) {
            setError('Failed to initialize table view. Please try again.');
            setLoading(false);
          }
        }
      }
    };
    
    // Reset state when table changes
    setData([]);
    setFieldNames([]);
    setAllFields([]);
    setLoading(true);
    setError(null);
    
    fetchAll();
    return () => { isMounted = false; };
  }, [accounts, tableName, instance]);
  
  // Handle cell value changes
  const handleCellValueChanged = async (params) => {
    if (!accounts || accounts.length === 0 || !primaryKeyCol) return;
    
    const { data: rowData, colDef, newValue, oldValue } = params;
    
    // Skip if value didn't change
    if (newValue === oldValue) return;
    
    // Don't allow editing primary key if it's auto-incrementing
    if (colDef.field === primaryKeyCol && isPkAutoIncrement) {
      toast.error("Cannot edit auto-incrementing primary key");
      fetchData(); // Refresh to revert changes
      return;
    }
    
    try {
      const updatedData = { ...rowData };
      updatedData[colDef.field] = newValue;
      
      console.log('[DEBUG] Attempting to update row', {
        tableName,
        primaryKeyCol,
        rowId: rowData[primaryKeyCol],
        updatedData,
        rowData
      });
      
      const response = await apiService.updateRow(
        instance,
        accounts[0],
        tableName,
        rowData[primaryKeyCol],
        updatedData,
        primaryKeyCol
      );
      
      console.log('[DEBUG] Update row API response:', response);
      toast.success('Cell updated successfully');
    } catch (err) {
      console.error('[DEBUG] Error updating cell:', err);
      toast.error('Failed to update cell. Please try again.');
      fetchData(); // Refresh to revert changes
    }
  };
  
  // Handle adding a new row (actual backend insert)
  const handleAddRow = async (rowData) => {
    if (!accounts || accounts.length === 0 || !primaryKeyCol) return;
    try {
      toast.loading('Adding new row...');
      const response = await apiService.insertRow(
        instance,
        accounts[0],
        tableName,
        rowData,
        primaryKeyCol
      );
      toast.dismiss();
      toast.success('Row added successfully');
      // Refresh data
      await fetchData();
      return response;
    } catch (err) {
      toast.dismiss();
      console.error('Error adding new row:', err);
      toast.error('Failed to add new row. Please try again.');
      throw err;
    }
  };

  // Handle deleting rows (actual backend delete)
  const handleDeleteRows = async (primaryKeys, rowsData) => {
    if (!accounts || accounts.length === 0 || !primaryKeyCol) return;
    try {
      toast.loading('Deleting row(s)...');
      for (const rowId of primaryKeys) {
        await apiService.deleteRow(
          instance,
          accounts[0],
          tableName,
          rowId,
          primaryKeyCol
        );
      }
      toast.dismiss();
      toast.success(`${primaryKeys.length} row(s) deleted successfully`);
      // Refresh data
      await fetchData();
    } catch (err) {
      toast.dismiss();
      console.error('Error deleting rows:', err);
      toast.error('Failed to delete rows. Please try again.');
      throw err;
    }
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!rowsToDelete || !accounts || accounts.length === 0) return;
    
    try {
      const { primaryKeys, rowsData } = rowsToDelete;
      
      // Delete each row
      for (const rowId of primaryKeys) {
        await apiService.deleteRow(
          instance,
          accounts[0],
          tableName,
          rowId,
          primaryKeyCol
        );
      }
      
      // Update local data
      const newData = data.filter(row => !primaryKeys.includes(row[primaryKeyCol]));
      setData(newData);
      
      toast.success(`${primaryKeys.length} row(s) deleted successfully`);
    } catch (err) {
      console.error('Error deleting rows:', err);
      toast.error('Failed to delete rows. Please try again.');
    } finally {
      setConfirmOpen(false);
      setRowsToDelete(null);
    }
  };
  
  // Handle page change
  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };
  
  // Handle filter change
  const handleFilterChange = (column, value) => {
    setFilterColumn(column);
    setFilterValue(value);
    fetchData(1, { filter_column: column, filter_value: value });
  };
  
  // Create sample data if no data is available and we're not loading
  useEffect(() => {
    // Only set default fields if we have no data, no field names, no error, and we're not loading
    if (!loading && data.length === 0 && fieldNames.length === 0 && !error) {
      console.log('ExcelTableView - Creating sample field names for empty table');
      // Set some default field names for an empty table
      const defaultFields = ['id', 'name', 'description', 'created_at'];
      setFieldNames(defaultFields);
      setAllFields(defaultFields);
      setPrimaryKeyCol('id');
    }
  }, [loading, data, fieldNames, error]);
  
  // If there's an error, show error message
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Handler functions must be defined above the return!
  // All handler and logic functions must be above this point!
  // Only the JSX return block should follow.

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {loading && (
        <div className="flex justify-center items-center h-20 mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-2">Loading data...</span>
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <div className="flex justify-center items-center h-20 mb-4">
          <span>No data available.</span>
        </div>
      )}

      <ExcelGridTable
        data={data || []}
        columnDefs={columnDefs}
        onCellValueChanged={handleCellValueChanged}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRows}
        primaryKeyCol={primaryKeyCol}
        isPkAutoIncrement={isPkAutoIncrement}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        filterOptions={allFields}
        onFilterChange={handleFilterChange}
        tableName={tableName}
        noPrimaryKey={noPrimaryKey}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${rowsToDelete?.primaryKeys?.length || 0} selected row(s)? This action cannot be undone.`}
      />
    </div>
  );
}

export default ExcelTableView;
