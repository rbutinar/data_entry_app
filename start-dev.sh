#!/bin/bash

# Start the FastAPI backend
echo "Starting FastAPI backend..."
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for the backend to start
sleep 2

# Start the React frontend
echo "Starting React frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Function to handle script termination
cleanup() {
  echo "Shutting down servers..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  exit 0
}

# Register the cleanup function for script termination
trap cleanup INT TERM

# Keep the script running
echo "Development servers are running. Press Ctrl+C to stop."
wait
