import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useMsal } from '@azure/msal-react';
import { apiService } from '../../services/apiService';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const ExcelTableView = ({ tableName }) => {
  const { instance, accounts } = useMsal();
  
  // State for table data
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100, // Larger page size for Excel view
    totalPages: 0,
    total: 0,
  });

  // Fetch table metadata
  const fetchMetadata = async () => {
    if (!accounts || accounts.length === 0) return;
    
    try {
      console.log(`Fetching metadata for table: ${tableName}`);
      const metadata = await apiService.getTableMetadata(instance, accounts[0], tableName);
      console.log('Table metadata:', metadata);
      
      // If we have column metadata, use it to create column definitions
      if (metadata && metadata.columns && metadata.columns.length > 0) {
        const colDefs = metadata.columns.map(col => ({
          field: col.name,
          headerName: col.name,
          sortable: true,
          filter: true,
          resizable: true,
          editable: false, // Read-only for Phase 1
          type: getColumnType(col.type),
        }));
        setColumnDefs(colDefs);
      }
    } catch (err) {
      console.error('Error fetching table metadata:', err);
    }
  };

  // Get AG Grid column type based on SQL type
  const getColumnType = (sqlType) => {
    if (!sqlType) return 'text';
    
    const type = sqlType.toLowerCase();
    if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('numeric')) {
      return 'numericColumn';
    }
    if (type.includes('date') || type.includes('time')) {
      return 'dateColumn';
    }
    return 'textColumn';
  };

  // Fetch data from API
  const fetchData = async (page = pagination.page) => {
    if (!accounts || accounts.length === 0) return;
    
    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: pagination.pageSize,
      };
      
      console.log(`[ExcelTableView] Fetching data for table: ${tableName}`, params);
      const response = await apiService.getTableData(
        instance,
        accounts[0],
        tableName,
        params
      );
      
      console.log(`[ExcelTableView] Data response:`, response);
      
      if (response && response.data) {
        console.log(`[ExcelTableView] Setting rowData with ${response.data.length} rows`);
        setRowData(response.data);
        setPagination({
          page: response.page,
          pageSize: response.pageSize,
          totalPages: response.totalPages,
          total: response.total,
        });
        
        // Create column definitions from data if we don't have them yet from metadata
        if (columnDefs.length === 0 && response.data.length > 0) {
          console.log(`[ExcelTableView] Creating column definitions from data`);
          const firstRow = response.data[0];
          const colDefs = Object.keys(firstRow)
            .filter(key => key !== '_tempId')
            .map(key => ({
              field: key,
              headerName: key,
              sortable: true,
              filter: true,
              resizable: true,
              editable: false, // Read-only for Phase 1
            }));
          console.log(`[ExcelTableView] Created ${colDefs.length} column definitions:`, colDefs);
          setColumnDefs(colDefs);
        } else if (columnDefs.length > 0) {
          console.log(`[ExcelTableView] Using existing ${columnDefs.length} column definitions`);
        }
      } else {
        console.log(`[ExcelTableView] No data in response`);
      }
      setError(null);
    } catch (err) {
      console.error('[ExcelTableView] Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
      setRowData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metadata and data when component mounts or table changes
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      if (accounts && accounts.length > 0) {
        console.log(`[ExcelTableView] Starting data fetch for table: ${tableName}`);
        await fetchMetadata();
        if (isMounted) {
          await fetchData();
        }
      }
    };
    fetchAll();
    return () => { isMounted = false; };
    // Note: Not including fetchData and fetchMetadata in deps to avoid infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, tableName, instance]);

  // AG Grid default column definitions
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
    editable: false, // Read-only for Phase 1
  }), []);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchData(newPage);
  };

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Excel View - Table Data</h2>
        <div className="flex items-center space-x-4">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            Read-only mode (Phase 1)
          </div>
          <div className="text-sm text-gray-600">
            Showing {rowData.length} of {pagination.total} rows
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : rowData.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No data found</div>
      ) : (
        <>
          <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
            <AgGridReact
              theme="legacy"
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              suppressRowClickSelection={true}
              rowSelection="multiple"
              animateRows={true}
              pagination={false} // We'll handle pagination ourselves
              suppressPaginationPanel={true}
              headerHeight={40}
              rowHeight={35}
              overlayLoadingTemplate="<span class='ag-overlay-loading-center'>Loading...</span>"
              overlayNoRowsTemplate="<span class='ag-overlay-no-rows-center'>No data to display</span>"
            />
          </div>
          
          {/* Custom Pagination */}
          {pagination.totalPages > 1 && (
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
                    Page <span className="font-medium">{pagination.page}</span> of{' '}
                    <span className="font-medium">{pagination.totalPages}</span> ({pagination.total} total rows)
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            pagination.page === pageNum 
                              ? 'border-primary-500 bg-primary-50 text-primary-600' 
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          } text-sm font-medium`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExcelTableView;