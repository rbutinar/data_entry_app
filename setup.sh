#!/bin/bash

# Setup script for Data Entry Application

echo "Setting up Data Entry Application..."

# Create Python virtual environment for backend
echo "Creating Python virtual environment..."
cd backend
python -m venv venv
source venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Setup frontend
echo "Setting up frontend..."
cd ../frontend
npm install

# Return to project root
cd ..

echo "Setup complete!"
echo "To seed the database with test data, run: python backend/seed_data.py"
echo "To start the development servers, run: ./start-dev.sh"
