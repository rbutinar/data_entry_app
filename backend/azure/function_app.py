import sys
import os
import subprocess

# Add the repo root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Print debug info
print("Python executable in use:", sys.executable)
print("sys.path:", sys.path)

# List of required packages
required_packages = [
    'fastapi',
    'sqlalchemy',
    'pyodbc',
    'python-jose',
    'python-dotenv',
    'pydantic',
    'cryptography',
    'python-multipart',
    'httpx',
    'azure-functions'
]

# Install any missing packages
for package in required_packages:
    try:
        __import__(package.replace('-', '_'))
        print(f"{package} is already installed")
    except ImportError:
        print(f"{package} not found, attempting to install...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"{package} installed successfully")

# Now import the required modules
from azure.functions import AsgiFunctionApp

# Try to import the app with a helpful error message
try:
    from backend.app.main import app
    print("Successfully imported FastAPI app")
except ImportError as e:
    print(f"Error importing app: {e}")
    print("Current directory:", os.getcwd())
    print("Available modules in backend:", os.listdir(os.path.join(os.path.dirname(__file__), '..')))
    raise

asgi_app = AsgiFunctionApp(app)
