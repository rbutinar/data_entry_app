import os
import pyodbc
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database connection details from environment variables
SERVER = os.getenv("SQL_SERVER_ENDPOINT")
PORT = os.getenv("SQL_SERVER_PORT")
DATABASE = os.getenv("SQL_DATABASE_NAME")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
ENCRYPT = os.getenv("SQL_ENCRYPT", "yes")
TRUST_SERVER_CERTIFICATE = os.getenv("SQL_TRUST_CERTIFICATE", "no")
TIMEOUT = int(os.getenv("SQL_TIMEOUT", "30"))

# Create connection string for Azure SQL with Service Principal authentication
conn_str = (
    f"Driver={{ODBC Driver 18 for SQL Server}};"
    f"Server={SERVER},{PORT};"
    f"Database={DATABASE};"
    f"UID={CLIENT_ID}@{TENANT_ID};"
    f"PWD={CLIENT_SECRET};"
    f"Authentication=ActiveDirectoryServicePrincipal;"
    f"Encrypt=yes;"
    f"TrustServerCertificate=no;"
    f"Connection Timeout={TIMEOUT};"
)

def seed_data():
    """Seed the database with initial test data."""
    try:
        # Print connection string for debugging (without the password)
        debug_conn_str = conn_str.replace(CLIENT_SECRET, '***')
        print(f"Connection string: {debug_conn_str}")
        
        # Connect to the database
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        print("Connected to the database successfully!")
        
        # Insert test users
        users = [
            (1, "user1@example.com", "User One"),
            (2, "user2@example.com", "User Two"),
            (3, "admin@example.com", "Admin User")
        ]
        
        for user in users:
            try:
                cursor.execute(
                    "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
                    user
                )
                print(f"Added user: {user[1]}")
            except pyodbc.IntegrityError:
                print(f"User {user[1]} already exists, skipping...")
        
        # Insert test tables
        tables = [
            (1, "customers", "Customer information"),
            (2, "orders", "Order details"),
            (3, "products", "Product catalog"),
            (4, "employees", "Employee records")
        ]
        
        for table in tables:
            try:
                cursor.execute(
                    "INSERT INTO tables (id, name, description) VALUES (?, ?, ?)",
                    table
                )
                print(f"Added table: {table[1]}")
            except pyodbc.IntegrityError:
                print(f"Table {table[1]} already exists, skipping...")
        
        # Insert user-table access permissions
        access_permissions = [
            (1, 1, 1),  # user1 -> customers
            (2, 1, 2),  # user1 -> orders
            (3, 2, 3),  # user2 -> products
            (4, 3, 1),  # admin -> customers
            (5, 3, 2),  # admin -> orders
            (6, 3, 3),  # admin -> products
            (7, 3, 4)   # admin -> employees
        ]
        
        for permission in access_permissions:
            try:
                cursor.execute(
                    "INSERT INTO user_table_access (id, user_id, table_id) VALUES (?, ?, ?)",
                    permission
                )
                print(f"Added permission: User {permission[1]} -> Table {permission[2]}")
            except pyodbc.IntegrityError:
                print(f"Permission for User {permission[1]} -> Table {permission[2]} already exists, skipping...")
        
        # Create sample data tables if they don't exist
        
        # Customers table
        try:
            cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customers')
            BEGIN
                CREATE TABLE customers (
                    id INT PRIMARY KEY,
                    first_name NVARCHAR(100),
                    last_name NVARCHAR(100),
                    email NVARCHAR(255),
                    phone NVARCHAR(20),
                    address NVARCHAR(255),
                    city NVARCHAR(100),
                    country NVARCHAR(100)
                )
            END
            """)
            print("Created customers table")
        except Exception as e:
            print(f"Error creating customers table: {e}")
        
        # Orders table
        try:
            cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
            BEGIN
                CREATE TABLE orders (
                    id INT PRIMARY KEY,
                    customer_id INT,
                    order_date DATETIME,
                    total_amount DECIMAL(10, 2),
                    status NVARCHAR(50)
                )
            END
            """)
            print("Created orders table")
        except Exception as e:
            print(f"Error creating orders table: {e}")
        
        # Products table
        try:
            cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'products')
            BEGIN
                CREATE TABLE products (
                    id INT PRIMARY KEY,
                    name NVARCHAR(255),
                    description NVARCHAR(MAX),
                    price DECIMAL(10, 2),
                    category NVARCHAR(100),
                    stock INT
                )
            END
            """)
            print("Created products table")
        except Exception as e:
            print(f"Error creating products table: {e}")
        
        # Employees table
        try:
            cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employees')
            BEGIN
                CREATE TABLE employees (
                    id INT PRIMARY KEY,
                    first_name NVARCHAR(100),
                    last_name NVARCHAR(100),
                    email NVARCHAR(255),
                    department NVARCHAR(100),
                    position NVARCHAR(100),
                    hire_date DATE,
                    salary DECIMAL(10, 2)
                )
            END
            """)
            print("Created employees table")
        except Exception as e:
            print(f"Error creating employees table: {e}")
        
        # Insert sample data into customers table
        customers = [
            (1, "John", "Doe", "john.doe@example.com", "555-123-4567", "123 Main St", "New York", "USA"),
            (2, "Jane", "Smith", "jane.smith@example.com", "555-987-6543", "456 Oak Ave", "Los Angeles", "USA"),
            (3, "Michael", "Johnson", "michael.j@example.com", "555-567-8901", "789 Pine Rd", "Chicago", "USA"),
            (4, "Emily", "Brown", "emily.b@example.com", "555-234-5678", "321 Elm St", "Houston", "USA"),
            (5, "David", "Wilson", "david.w@example.com", "555-345-6789", "654 Maple Dr", "Phoenix", "USA")
        ]
        
        for customer in customers:
            try:
                cursor.execute("""
                IF NOT EXISTS (SELECT * FROM customers WHERE id = ?)
                BEGIN
                    INSERT INTO customers (id, first_name, last_name, email, phone, address, city, country)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                END
                """, customer[0], *customer)
                print(f"Added customer: {customer[1]} {customer[2]}")
            except Exception as e:
                print(f"Error adding customer {customer[1]} {customer[2]}: {e}")
        
        # Insert sample data into orders table
        orders = [
            (1, 1, "2023-01-15", 125.99, "Completed"),
            (2, 2, "2023-02-20", 89.50, "Completed"),
            (3, 3, "2023-03-10", 210.75, "Processing"),
            (4, 1, "2023-04-05", 45.25, "Completed"),
            (5, 4, "2023-05-12", 175.00, "Shipped")
        ]
        
        for order in orders:
            try:
                cursor.execute("""
                IF NOT EXISTS (SELECT * FROM orders WHERE id = ?)
                BEGIN
                    INSERT INTO orders (id, customer_id, order_date, total_amount, status)
                    VALUES (?, ?, ?, ?, ?)
                END
                """, order[0], *order)
                print(f"Added order: {order[0]}")
            except Exception as e:
                print(f"Error adding order {order[0]}: {e}")
        
        # Insert sample data into products table
        products = [
            (1, "Laptop", "High-performance laptop with 16GB RAM", 999.99, "Electronics", 25),
            (2, "Smartphone", "Latest model with 128GB storage", 699.99, "Electronics", 50),
            (3, "Desk Chair", "Ergonomic office chair", 199.99, "Furniture", 15),
            (4, "Coffee Maker", "Programmable coffee maker", 49.99, "Appliances", 30),
            (5, "Headphones", "Noise-cancelling wireless headphones", 149.99, "Electronics", 40)
        ]
        
        for product in products:
            try:
                cursor.execute("""
                IF NOT EXISTS (SELECT * FROM products WHERE id = ?)
                BEGIN
                    INSERT INTO products (id, name, description, price, category, stock)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
                """, product[0], *product)
                print(f"Added product: {product[1]}")
            except Exception as e:
                print(f"Error adding product {product[1]}: {e}")
        
        # Insert sample data into employees table
        employees = [
            (1, "Robert", "Johnson", "robert.j@example.com", "Sales", "Sales Manager", "2020-01-15", 85000.00),
            (2, "Sarah", "Williams", "sarah.w@example.com", "Marketing", "Marketing Specialist", "2021-03-10", 65000.00),
            (3, "James", "Brown", "james.b@example.com", "IT", "Software Developer", "2019-06-22", 95000.00),
            (4, "Lisa", "Davis", "lisa.d@example.com", "HR", "HR Manager", "2018-11-05", 78000.00),
            (5, "Thomas", "Miller", "thomas.m@example.com", "Finance", "Financial Analyst", "2022-02-18", 72000.00)
        ]
        
        for employee in employees:
            try:
                cursor.execute("""
                IF NOT EXISTS (SELECT * FROM employees WHERE id = ?)
                BEGIN
                    INSERT INTO employees (id, first_name, last_name, email, department, position, hire_date, salary)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                END
                """, employee[0], *employee)
                print(f"Added employee: {employee[1]} {employee[2]}")
            except Exception as e:
                print(f"Error adding employee {employee[1]} {employee[2]}: {e}")
        
        # Commit the changes
        conn.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        # Close the connection
        if 'conn' in locals():
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    seed_data()
