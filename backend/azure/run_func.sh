#!/bin/bash

# Path to your virtual environment
VENV_PATH="../../venv"

# Activate the virtual environment
source $VENV_PATH/bin/activate

# Copy requirements.txt to function app directory
cp ../requirements.txt ./requirements.txt

# Ensure all dependencies are installed in the venv
pip install -r requirements.txt

# Set environment variables for Azure Functions Core Tools
export VIRTUAL_ENV=$(cd $VENV_PATH && pwd)
export PATH="$VIRTUAL_ENV/bin:$PATH"
export PYTHONPATH="$VIRTUAL_ENV/lib/python3.*/site-packages:$PYTHONPATH"

# Print debug info
echo "=== Environment Setup ==="
echo "VIRTUAL_ENV: $VIRTUAL_ENV"
echo "Python executable: $(which python)"
echo "Python version: $(python --version)"
echo "FastAPI installed: $(pip show fastapi | grep Version || echo "NOT INSTALLED")"
echo "========================="

# Kill any existing func processes
pkill -f func || true

# Run Azure Functions Core Tools with a different port and verbose output
func start --port 9000 --verbose
