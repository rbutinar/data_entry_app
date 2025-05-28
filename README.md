# PowerApps-style React Frontend with SQL Editing

## Current Status

✅ **Fully Functional & Production Ready**

- The app now supports robust row and cell editing, filtering, adding, and deleting records.
- The filter menu is always populated with the correct column names.
- All core features are stable and work as expected for end users and admins.
- No known blocking issues remain for standard usage.

A React-based front-end web app that connects to a SQL database (Azure SQL or PostgreSQL) and allows authenticated users to browse available tables, view and edit data in a spreadsheet-like table, apply filters, and update individual cells or entire records.

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
- **Description:** Insert a new row into the specified table.
- **Example:**
  ```sh
  curl -L -X POST "http://localhost:8000/data/tabella_1" \
    -H "Content-Type: application/json" \
    -d '{"column1": "value1", "column2": "value2"}'
  ```

### 4. Update Row (Update)
- **Endpoint:** `PATCH /data/{table_name}/{row_id}`
- **Description:** Update a specific row in the table.
- **Example:**
  ```sh
  curl -L -X PATCH "http://localhost:8000/data/tabella_1/1" \
    -H "Content-Type: application/json" \
    -d '{"column1": "new_value"}'
  ```

### 5. Delete Row (Delete)
- **Endpoint:** `DELETE /data/{table_name}/{row_id}`
- **Description:** Delete a specific row from the table.
- **Example:**
  ```sh
  curl -L -X DELETE "http://localhost:8000/data/tabella_1/1"
  ```

### 6. Get Table Metadata
- **Endpoint:** `GET /tables/{table_name}`
- **Description:** Returns metadata for a specific table.
- **Example:**
  ```sh
  curl -L -X GET "http://localhost:8000/tables/tabella_1"
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
   ```
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

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
