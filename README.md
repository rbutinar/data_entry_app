# PowerApps-style React Frontend with SQL Editing

## Current Status

✅ **Fully Functional & Production Ready**

- **🚀 LIVE IN PRODUCTION**: https://data-entry-app-prod--a5dnzgk.lemoncoast-2884006a.westeurope.azurecontainerapps.io
- The app now supports robust row and cell editing, filtering, adding, and deleting records.
- The filter menu is always populated with the correct column names.
- All core features are stable and work as expected for end users and admins.
- Dynamic primary key handling supports tables with different primary key column names and both auto-incrementing and non-auto-incrementing primary keys.
- Improved cell editing experience with proper focus management.
- **Fully containerized** with Docker and deployed on Azure Container Apps
- **Terraform infrastructure** for reproducible deployments
- No known blocking issues remain for standard usage.

---

## Planned Features & Roadmap

The following features are planned for upcoming releases:

- **Data entry for tables without a primary key:**
  - Allow insert, edit, and delete operations even when no PK is defined, with appropriate UI and backend support.

- **Flexible authentication:**
  - Support both credential-based (admin-defined) and Microsoft Entra ID (Azure AD) passthrough authentication, configurable via settings.
- **Excel-like grid with AG Grid or similar:**
  - Option to use AG Grid React or a similar library for a more "Excel-style" data entry and editing experience, including advanced features like copy-paste, fill handle, and keyboard navigation.
- **CI/CD Pipeline:**
  - GitHub Actions workflow for automated build and deployment
- **Advanced monitoring:**
  - Application Insights integration for performance monitoring

If you are interested in contributing or have feature requests, please open an issue or PR!

---

A React-based front-end web app that connects to a SQL database (Azure SQL or PostgreSQL) and allows authenticated users to browse available tables, view and edit data in a spreadsheet-like table, apply filters, and update individual cells or entire records.

## Deployment Options

### 🚀 **Production (Azure Container Apps)**
- **Live URL**: https://data-entry-app-prod--a5dnzgk.lemoncoast-2884006a.westeurope.azurecontainerapps.io
- **Infrastructure**: Terraform managed
- **Auto-scaling**: 1-3 replicas based on load
- **Monitoring**: Azure Log Analytics integration

### 🐳 **Docker (Local)**
```bash
docker-compose up --build
# App available at http://localhost:8000
```

### 🛠️ **Development (Local)**
```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python run.py

# Frontend (separate terminal)
cd frontend && npm install && npm start
```

## How to Use

1. **Sign in** with your Azure AD credentials.
2. **Browse** the list of available tables.
3. **View and edit** data in a spreadsheet-like interface:
    - Click the pencil icon to edit a row. All cells become editable inline.
    - Click the checkmark to save changes, or X to cancel.
    - Use the filter menu to select a column and enter a value to filter data.
    - Add new rows using the "Add New Row" button.
    - Delete rows using the trash icon.
4. **All changes** are immediately reflected in the database (with simulated success if backend permissions are limited).


## Features

- Azure AD Single Sign-On (SSO) authentication
- Browse tables the user has access to
- View and edit data in a spreadsheet-like interface
- Apply filters to data
- Update individual cells or entire records
- Server-side access control based on user permissions

---

## Dynamic Runtime Database Settings (NEW)

You can now update the app's Azure SQL or Microsoft Fabric database connection settings at runtime, directly from the frontend UI—no backend restart required!

### How it works
- Open the **Database Settings** modal from the dashboard.
- Enter or update the database connection parameters (endpoint, port, database name, tenant ID, client ID, client secret, etc.).
- Save to immediately apply the new settings. The backend will use these for new connections without a restart.
- The frontend will refresh the tables list automatically after saving.
- If no runtime settings are provided, the backend falls back to the `.env` file values.
- Settings are stored in memory only (not persisted)—restarting the backend resets to `.env`.

### Supported Parameters
- SQL Server/Fabric endpoint
- Port
- Database name (optional for Fabric Warehouse endpoints)
- Azure AD Tenant ID
- Azure AD Client ID
- Azure AD Client Secret
- Optional: Encrypt, TrustServerCertificate, Timeout

### Security Notes
- **No secrets are persisted**: All overrides are in-memory for the backend session only.
- **Do not use in production** without securing the settings API and UI.
- For public/demo use, no user secrets are stored server-side or in the browser.

---

## Tech Stack

### Frontend
- React with Hooks
- Tailwind CSS for styling
- MSAL for Azure AD authentication
- React Router for navigation
- TanStack Table (React Table) for data grid
- React Hot Toast for notifications

### Backend
- FastAPI with async endpoints
- SQLAlchemy ORM for database interaction
- Token validation via python-jose
- Azure SQL (Fabric) for persistent storage

---

## Backend API Endpoints & Usage

---

### ⚡ Developer/Tester Debug Endpoints (No Auth Required)

These endpoints are useful for debugging, development, or when you want to quickly inspect the database without authentication.

#### 1. List All Tables (Debug)
- **Endpoint:** `GET /debug/test-tables`
- **Description:** Returns a list of all tables in the database (no authentication required).
- **Example:**
  ```sh
  curl http://localhost:8000/debug/test-tables
  ```

#### 2. Get Table Structure/Schema (Debug)
- **Endpoint:** `GET /debug/test-table-metadata/{table_name}`
- **Description:** Returns metadata for a table, including column names, types, and primary key info (no authentication required).
- **Example:**
  ```sh
  curl http://localhost:8000/debug/test-table-metadata/tabella_1
  curl http://localhost:8000/debug/test-table-metadata/tabella_2
  curl http://localhost:8000/debug/test-table-metadata/tabella_3
  curl http://localhost:8000/debug/test-table-metadata/tabella_4
  ```

If you receive `{ "detail": "Not Found" }`, double-check the table name or use the list tables endpoint above to see available tables.

---

### 1. List Tables
- **Endpoint:** `GET /tables/`
- **Description:** Returns all tables accessible to the user.
- **Example:**
  ```sh
  curl -L -X GET "http://localhost:8000/tables/"
  ```

### 2. Get Table Data (Read)
- **Endpoint:** `GET /data/{table_name}`
- **Description:** Returns data from a table, supports pagination and filtering.
- **Example:**
  ```sh
  curl -L -X GET "http://localhost:8000/data/tabella_1?page=1&page_size=10"
  ```

### 3. Insert Row (Create)
- **Endpoint:** `POST /data/{table_name}`
- **Description:** Insert a new row into the specified table. Supports dynamic primary key columns.
- **Parameters:**
  - `pk` (optional): Specify the primary key column name if different from 'id'
- **Example:**
  ```sh
  curl -L -X POST "http://localhost:8000/data/tabella_1?pk=newid" \
    -H "Content-Type: application/json" \
    -d '{"newid": "value1", "column2": "value2"}'
  ```

### 4. Update Row (Update)
- **Endpoint:** `PATCH /data/{table_name}/{row_id}`
- **Description:** Update a specific row in the table. Supports dynamic primary key columns.
- **Parameters:**
  - `pk` (optional): Specify the primary key column name if different from 'id'
- **Example:**
  ```sh
  curl -L -X PATCH "http://localhost:8000/data/tabella_1/1?pk=newid" \
    -H "Content-Type: application/json" \
    -d '{"column1": "new_value"}'
  ```

### 5. Delete Row (Delete)
- **Endpoint:** `DELETE /data/{table_name}/{row_id}`
- **Description:** Delete a specific row from the table. Supports dynamic primary key columns.
- **Parameters:**
  - `pk` (optional): Specify the primary key column name if different from 'id'
- **Example:**
  ```sh
  curl -L -X DELETE "http://localhost:8000/data/tabella_1/1?pk=newid"
  ```

### 6. Get Table Metadata
- **Endpoint:** `GET /metadata/{table_name}`
- **Description:** Returns metadata for a specific table including column details, primary key column name, and whether the primary key is auto-incrementing.
- **Example:**
  ```sh
  curl -L -X GET "http://localhost:8000/metadata/tabella_1"
  ```

---

### Authentication
If authentication is enabled, add your Bearer token to the curl command:
```sh
-H "Authorization: Bearer <your_token>"
```

---

### Notes
- Replace `tabella_1` and column names with actual table/column names as needed.
- Use the `/tables/` endpoint to discover available tables.
- Use `-L` with curl to follow redirects (for endpoints with trailing slashes).
- All endpoints return JSON responses.

## Project Structure

```
data_entry_app/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   │   └── token.py
│   │   ├── routers/
│   │   │   ├── data.py
│   │   │   └── tables.py
│   │   └── main.py
│   ├── database/
│   │   └── connection.py
│   └── models/
│       └── models.py
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── components/
│       │   └── Layout.js
│       ├── pages/
│       │   ├── Dashboard.js
│       │   ├── Login.js
│       │   └── TableView.js
│       ├── services/
│       │   ├── apiService.js
│       │   └── authService.js
│       ├── App.js
│       ├── authConfig.js
│       ├── index.css
│       └── index.js
└── .env
```

## Setup Instructions

### Prerequisites
- Node.js and npm
- Python 3.8+
- Azure AD tenant with registered application
- Access to Azure SQL (Fabric)

### Backend Setup

1. Install the required Python packages:
   ```
   cd backend
   pip install -r requirements.txt
   ```

2. Make sure your `.env` file contains the necessary environment variables:
   ```
   # SQL Server connection details
   SQL_SERVER_ENDPOINT=your-fabric-sql-endpoint.database.fabric.microsoft.com
   SQL_SERVER_PORT=1433
   SQL_DATABASE_NAME=your_database_name

   # Service Principal credentials:
   AZURE_CLIENT_ID=your_client_id
   AZURE_TENANT_ID=your_tenant_id
   AZURE_CLIENT_SECRET=your_client_secret

   # Optional defaults
   SQL_ENCRYPT=true
   SQL_TRUST_CERTIFICATE=false
   SQL_TIMEOUT=30
   ```

3. Start the FastAPI server:
   
   From the project root (`c:\codebase\data_entry_app`), run:
   ```sh
   uvicorn backend.app.main:app --reload --port 8000
   ```
   
   > **Note:** Do NOT run `uvicorn app.main:app` from inside the backend directory, as the code expects to be run from the project root.

### Frontend Setup

1. Install the required npm packages:
   ```
   cd frontend
   npm install
   ```

2. Start the React development server:
   ```
   cd frontend
   npm start
   ```

3. The application will be available at `http://localhost:3000`

## Database Schema

The application uses the following database schema:

```sql
-- Users allowed to log in
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT
);

-- Tables that can be browsed
CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Link users to allowed tables
CREATE TABLE user_table_access (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    table_id INT REFERENCES tables(id)
);
```

## Access Control

The application implements a strict server-side access control mechanism:

1. Users authenticate via Azure AD in the frontend
2. The backend validates the token and extracts the user's email
3. The backend checks if the user exists in the `users` table
4. When accessing tables, the backend verifies that the user has access to the requested table via the `user_table_access` table
5. All data operations are filtered based on the user's permissions

## API Endpoints

- `GET /tables`: Get all tables the user has access to
- `GET /tables/{table_name}`: Get metadata for a specific table
- `GET /data/{table_name}`: Get data from a table with pagination and filtering
- `PATCH /data/{table_name}/{row_id}`: Update a specific row in a table
- `POST /data/{table_name}`: Insert a new row into a table
- `DELETE /data/{table_name}/{row_id}`: Delete a specific row from a table
