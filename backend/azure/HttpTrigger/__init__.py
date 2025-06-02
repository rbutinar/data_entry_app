import azure.functions as func
import os
import sys
import logging

# Add the repo root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Print debug info
logging.info(f"Python executable in use: {sys.executable}")
logging.info(f"sys.path: {sys.path}")

try:
    # Import the ASGI adapter and FastAPI app
    from azure.functions import AsgiMiddleware
    from backend.app.main import app
    logging.info("Successfully imported FastAPI app")
except ImportError as e:
    logging.error(f"Error importing app: {e}")
    logging.error(f"Current directory: {os.getcwd()}")
    raise

# Create the ASGI middleware handler
async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    """Each request is redirected to the ASGI handler."""
    logging.info(f"Received request: {req.method} {req.url}")
    return await AsgiMiddleware(app).handle_async(req, context)
