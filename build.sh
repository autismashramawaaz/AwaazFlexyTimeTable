#!/bin/bash
# Build script for Render deployment

# Exit on error
set -e

# Set up Python environment
echo "Setting up Python environment..."
pip install -r requirements.txt

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p data/caregivers
mkdir -p data/categories
mkdir -p data/activities 
mkdir -p data/templates
mkdir -p data/calendars
mkdir -p static/images/caregivers

# Add .gitkeep files to ensure directories are created
touch data/caregivers/.gitkeep
touch data/categories/.gitkeep
touch data/activities/.gitkeep
touch data/templates/.gitkeep
touch data/calendars/.gitkeep
touch static/images/caregivers/.gitkeep

# Set correct permissions for scripts
chmod +x setup_git_access.sh
chmod +x diagnose_git.py

# Set up Git access
echo "Setting up Git access..."
./setup_git_access.sh

# Run diagnostic tests
echo "Running Git diagnostics..."
python diagnose_git.py || echo "Git diagnostics failed but continuing with build"

echo "Build completed successfully!" 