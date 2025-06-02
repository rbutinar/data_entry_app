import { apiConfig } from '../authConfig';
import { getAccessToken } from './authService';

/**
 * API service for handling data operations
 */
export const apiService = {
  /**
   * Get metadata for a specific table including primary key information
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @param {string} tableName - Name of the table
   * @returns {Promise<Object>} Table metadata including primary key information
   */
  async getTableMetadata(instance, account, tableName) {
    try {

      const accessToken = await getAccessToken(instance, account);
      
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.tables}/metadata/${tableName}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching table metadata: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`Error in getTableMetadata: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get all tables the user has access to
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @returns {Promise<Array>} List of tables
   */
  async getTables(instance, account) {
    const accessToken = await getAccessToken(instance, account);
    
    const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.tables}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching tables: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * Get data from a specific table
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @param {string} tableName - Name of the table
   * @param {Object} params - Query parameters (page, page_size, filter_column, filter_value)
   * @returns {Promise<Object>} Table data with pagination info
   */
  async getTableData(instance, account, tableName, params = {}) {
    try {
      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('page_size', params.page_size);
      if (params.filter_column) queryParams.append('filter_column', params.filter_column);
      if (params.filter_value) queryParams.append('filter_value', params.filter_value);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Call the authenticated endpoint for table data
      console.log(`[apiService.getTableData] Calling authenticated endpoint for table: ${tableName}`);
      const accessToken = await getAccessToken(instance, account);
      
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}${queryString}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('[apiService.getTableData] API response status:', response.status);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`You don't have access to the table '${tableName}'`);
        } else {
          throw new Error(`Error fetching table data: ${response.statusText}`);
        }
      }
      
      const responseData = await response.json();
      console.log(`[apiService.getTableData] Auth endpoint data structure:`, {
        hasData: !!responseData.data,
        dataLength: responseData.data ? responseData.data.length : 0,
        pagination: {
          page: responseData.page,
          pageSize: responseData.pageSize,
          total: responseData.total,
          totalPages: responseData.totalPages
        }
      });
      
      // Make sure the response has the expected structure
      if (!responseData.data) {
        console.warn(`[apiService.getTableData] Auth endpoint response missing data property`);
        responseData.data = [];
      }
      
      return responseData;
    } catch (error) {
      console.error(`[apiService.getTableData] Error:`, error);
      throw error;
    }
  },
  
  /**
   * Update a row in a table
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @param {string} tableName - Name of the table
   * @param {number} rowId - ID of the row to update
   * @param {Object} updates - Object containing column-value pairs to update
   * @param {string} primaryKeyCol - Name of the primary key column
   * @returns {Promise<Object>} Response data
   */
  async updateRow(instance, account, tableName, rowId, updates, primaryKeyCol) {
    try {
      // Debug logging for test endpoint
      const testUrl = `${apiConfig.baseUrl}/debug/test-table-data/${tableName}/${rowId}?pk=${primaryKeyCol}`;
      const testOptions = {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      };
      console.log('[apiService.updateRow] TEST endpoint:', {
        url: testUrl,
        method: 'PATCH',
        pk: primaryKeyCol,
        rowId,
        updates
      });
      const testResponse = await fetch(testUrl, testOptions);
      let testResponseBody;
      try { testResponseBody = await testResponse.clone().json(); } catch { testResponseBody = await testResponse.clone().text(); }
      console.log('[apiService.updateRow] TEST endpoint response:', {
        status: testResponse.status,
        body: testResponseBody
      });
      if (testResponse.ok) {
        return testResponseBody;
      }
      // If test endpoint fails, try the authenticated endpoint
      const accessToken = await getAccessToken(instance, account);
      const url = `${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}/${rowId}?pk=${primaryKeyCol}`;
      const options = {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      };
      console.log('[apiService.updateRow] AUTH endpoint:', {
        url,
        method: 'PATCH',
        pk: primaryKeyCol,
        rowId,
        updates
      });
      const response = await fetch(url, options);
      let responseBody;
      try { responseBody = await response.clone().json(); } catch { responseBody = await response.clone().text(); }
      console.log('[apiService.updateRow] AUTH endpoint response:', {
        status: response.status,
        body: responseBody
      });
      if (!response.ok) {
        throw new Error(`Error updating row: ${response.statusText}`);
      }
      return responseBody;
    } catch (error) {
      console.error('[apiService.updateRow] ERROR:', error);
      throw error;
    }
  },
  
  /**
   * Insert a new row into a table
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @param {string} tableName - Name of the table
   * @param {Object} data - Object containing column-value pairs for the new row
   * @param {string} primaryKeyCol - Name of the primary key column
   * @returns {Promise<Object>} Response data
   */
  async insertRow(instance, account, tableName, data, primaryKeyCol = 'id') {
    try {
      const accessToken = await getAccessToken(instance, account);
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}?pk=${primaryKeyCol}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`Error inserting row: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error in insertRow:', error);
      throw error;
    }
  },
  
  /**
   * Delete a row from a table
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @param {string} tableName - Name of the table
   * @param {number} rowId - ID of the row to delete
   * @param {string} primaryKeyCol - Name of the primary key column
   * @returns {Promise<Object>} Response data
   */
  async deleteRow(instance, account, tableName, rowId, primaryKeyCol = 'id') {
    try {
      const accessToken = await getAccessToken(instance, account);
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}/${rowId}?pk=${primaryKeyCol}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Error deleting row: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error in deleteRow:', error);
      throw error;
    }
  }
};
