import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { toast } from 'react-hot-toast';
import { apiConfig } from '../authConfig';
import { getAccessToken } from '../services/authService';
import { TableCellsIcon } from '@heroicons/react/24/outline';
import DbSettingsForm from '../components/DbSettingsForm';

const Dashboard = () => {
  const { instance, accounts } = useMsal();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState(null);
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [settings, setSettings] = useState(null);
  
  // Fetch tables function should be top-level so it can be called after settings save
  const fetchTables = async () => {
    try {
      // (existing fetch logic)
      console.log('Dashboard - Fetching tables, accounts:', accounts);
      const testApiUrl = `${apiConfig.baseUrl}/debug/test-tables`;
      console.log('Dashboard - Fetching from test URL:', testApiUrl);
      const testResponse = await fetch(testApiUrl);
      if (testResponse.ok) {
        console.log('Dashboard - Test API response status:', testResponse.status);
        const data = await testResponse.json();
        console.log('Dashboard - Received tables data from test endpoint:', data);
        setTables(data);
        setLoading(false);
        return;
      }
      // If test endpoint fails, try authenticated endpoint
      console.log('Dashboard - Test endpoint failed, trying authenticated endpoint');
      const accessToken = await getAccessToken(instance, accounts[0]);
      console.log('Dashboard - Got access token, length:', accessToken?.length);
      const apiUrl = `${apiConfig.baseUrl}${apiConfig.endpoints.tables}`;
      console.log('Dashboard - Fetching from URL:', apiUrl);
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('Dashboard - API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Dashboard - Error response body:', errorText);
        throw new Error(`Error fetching tables: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Dashboard - Received tables data:', data);
      setTables(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error('Dashboard - Failed to fetch tables:', error);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [instance, accounts]);
  
  const fetchDbInfo = async () => {
    try {
      setLoading(true);
      const accessToken = await getAccessToken(instance, accounts[0]);
      
      const response = await fetch(`${apiConfig.baseUrl}/debug/db-info`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching database info: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Database info:', data);
      setDbInfo(data);
      setShowDbInfo(true);
    } catch (error) {
      console.error('Failed to fetch database info:', error);
      toast.error('Failed to load database info. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Available Tables</h3>
        <div>
          <button
            onClick={async () => {
              // Fetch settings from backend
              try {
                const res = await fetch('http://localhost:8000/settings/db-credentials');
                if (res.ok) {
                  const data = await res.json();
                  // Map new API format { field: { value, source } } to flat { field: value }
                  const flat = {
                    tenant_id: data.tenant_id?.value || '',
                    client_id: data.client_id?.value || '',
                    client_secret: data.client_secret?.value || '',
                    endpoint: data.endpoint?.value || '',
                    database: data.database?.value || '',
                    port: data.port?.value || '1433',
                  };
                  setSettings(flat);
                } else {
                  setSettings({});
                }
              } catch (e) {
                setSettings({});
              }
              setShowDbInfo('settings');
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Database Connection Settings
          </button>
        </div>
      </div>
      
      {showDbInfo === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <h3 className="text-xl font-bold mb-2">Database Connection Settings</h3>
            <p className="mb-4 text-gray-600">Set or override the Tenant ID, Client Secret, and Endpoint for the database connection. These values override the environment variables when set.</p>
            <DbSettingsForm
              initialSettings={settings || {}}
              onSave={async (settings) => {
                try {
                  const response = await fetch('http://localhost:8000/settings/db-credentials', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(settings),
                  });
                  if (response.ok) {
                    toast.success('Database connection settings saved!');
                    // Refresh tables after successful save
                    await fetchTables();
                  } else {
                    toast.error('Failed to save settings');
                  }
                } catch (err) {
                  toast.error('Failed to save settings');
                }
                setShowDbInfo(false);
              }}
              onCancel={() => setShowDbInfo(false)}
            />
          </div>
        </div>
      )}

      {showDbInfo === 'info' && dbInfo && (
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Database Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details about your database connection and tables.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Connection Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{dbInfo.connection}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Database Tables</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {dbInfo.database_tables.length > 0 ? (
                    <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                      {dbInfo.database_tables.map((table, index) => (
                        <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                          <div className="w-0 flex-1 flex items-center">
                            <span className="ml-2 flex-1 w-0 truncate">{table}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No tables found in database.</p>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Table Models</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {Array.isArray(dbInfo.table_models) && dbInfo.table_models.length > 0 ? (
                    <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                      {dbInfo.table_models.map((table, index) => (
                        <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                          <div className="w-0 flex-1 flex items-center">
                            <span className="ml-2 flex-1 w-0 truncate">{table.name} - {table.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No table models found. This is why you don't see any tables in the UI.</p>
                  )}
                </dd>
              </div>
            </dl>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              onClick={() => setShowDbInfo(false)}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {!showDbInfo && tables.length === 0 ? (
        <div className="mt-6 text-center">
          <p className="text-gray-500">No tables available for your account.</p>
          <p className="mt-2 text-sm text-gray-500">Click "Check Database Connection" to diagnose the issue.</p>
        </div>
      ) : (!showDbInfo && tables.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Link
              key={table.id}
              to={`/table/${table.name}`}
              className="block bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <TableCellsIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">{table.name}</h3>
                    {table.description && (
                      <p className="mt-1 text-sm text-gray-500">{table.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-primary-600 hover:text-primary-700">
                    View and edit data
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
