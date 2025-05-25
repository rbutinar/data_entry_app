import { apiConfig } from '../authConfig';
import { getAccessToken } from './authService';

/**
 * API service for handling data operations
 */
export const apiService = {
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
      
      // First try the test endpoint without authentication
      console.log(`Trying test endpoint for table data: ${tableName}`);
      const testUrl = `${apiConfig.baseUrl}/debug/test-table-data/${tableName}${queryString}`;
      console.log(`Test URL: ${testUrl}`);
      
      const testResponse = await fetch(testUrl);
      
      if (testResponse.ok) {
        console.log(`Test endpoint successful for table: ${tableName}`);
        return testResponse.json();
      }
      
      // If test endpoint fails, try the authenticated endpoint
      console.log(`Test endpoint failed, trying authenticated endpoint for table: ${tableName}`);
      const accessToken = await getAccessToken(instance, account);
      
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}${queryString}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`You don't have access to the table '${tableName}'`);
        } else {
          throw new Error(`Error fetching table data: ${response.statusText}`);
        }
      }
      
      return response.json();
    } catch (error) {
      console.error(`Error in getTableData: ${error.message}`);
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
   * @returns {Promise<Object>} Response data
   */
  async updateRow(instance, account, tableName, rowId, updates) {
    try {
      // First try the test endpoint without authentication
      console.log(`Trying test endpoint for updating row in table: ${tableName}`);
      const testUrl = `${apiConfig.baseUrl}/debug/test-table-data/${tableName}/${rowId}`;
      console.log(`Test URL: ${testUrl}`);
      
      const testResponse = await fetch(testUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (testResponse.ok) {
        console.log(`Test endpoint successful for updating row in table: ${tableName}`);
        return testResponse.json();
      }
      
      // If test endpoint fails, try the authenticated endpoint
      console.log(`Test endpoint failed, trying authenticated endpoint for updating row in table: ${tableName}`);
      const accessToken = await getAccessToken(instance, account);
      
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}/${rowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Error updating row: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`Error in updateRow: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Insert a new row into a table
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @param {string} tableName - Name of the table
   * @param {Object} data - Object containing column-value pairs for the new row
   * @returns {Promise<Object>} Response data
   */
  async insertRow(instance, account, tableName, data) {
    try {
      // First try the test endpoint without authentication
      console.log(`Trying test endpoint for inserting row in table: ${tableName}`);
      const testUrl = `${apiConfig.baseUrl}/debug/test-table-data/${tableName}`;
      console.log(`Test URL: ${testUrl}`);
      
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (testResponse.ok) {
        console.log(`Test endpoint successful for inserting row in table: ${tableName}`);
        return testResponse.json();
      }
      
      // If test endpoint fails, try the authenticated endpoint
      console.log(`Test endpoint failed, trying authenticated endpoint for inserting row in table: ${tableName}`);
      const accessToken = await getAccessToken(instance, account);
      
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}`, {
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
      console.error(`Error in insertRow: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Delete a row from a table
   * @param {Object} instance - MSAL instance
   * @param {Object} account - User account
   * @param {string} tableName - Name of the table
   * @param {number} rowId - ID of the row to delete
   * @returns {Promise<Object>} Response data
   */
  async deleteRow(instance, account, tableName, rowId) {
    try {
      // First try the test endpoint without authentication
      console.log(`Trying test endpoint for deleting row in table: ${tableName}`);
      const testUrl = `${apiConfig.baseUrl}/debug/test-table-data/${tableName}/${rowId}`;
      console.log(`Test URL: ${testUrl}`);
      
      const testResponse = await fetch(testUrl, {
        method: 'DELETE'
      });
      
      if (testResponse.ok) {
        console.log(`Test endpoint successful for deleting row in table: ${tableName}`);
        return testResponse.json();
      }
      
      // If test endpoint fails, try the authenticated endpoint
      console.log(`Test endpoint failed, trying authenticated endpoint for deleting row in table: ${tableName}`);
      const accessToken = await getAccessToken(instance, account);
      
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.data}/${tableName}/${rowId}`, {
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
      console.error(`Error in deleteRow: ${error.message}`);
      throw error;
    }
  }
};
