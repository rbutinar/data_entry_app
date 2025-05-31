import React, { useState } from 'react';

const DbSettingsForm = ({ onSave, initialSettings = {}, onCancel }) => {
  const [tenantId, setTenantId] = useState(initialSettings.tenant_id || '');
  const [clientId, setClientId] = useState(initialSettings.client_id || '');
  const [clientSecret, setClientSecret] = useState(initialSettings.client_secret || '');
  const [endpoint, setEndpoint] = useState(initialSettings.endpoint || '');
  const [database, setDatabase] = useState(initialSettings.database || '');
  const [port, setPort] = useState(initialSettings.port || '1433');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      tenant_id: tenantId,
      client_id: clientId,
      client_secret: clientSecret,
      endpoint,
      database,
      port,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Endpoint</label>
        <input
          type="text"
          value={endpoint}
          onChange={e => setEndpoint(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Database Name</label>
        <input
          type="text"
          value={database}
          onChange={e => setDatabase(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
        <input
          type="text"
          value={tenantId}
          onChange={e => setTenantId(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Client ID</label>
        <input
          type="text"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Client Secret</label>
        <input
          type="password"
          value={clientSecret}
          onChange={e => setClientSecret(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Port</label>
        <input
          type="number"
          value={port}
          onChange={e => setPort(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Save</button>
      </div>
    </form>
  );
};

export default DbSettingsForm;
