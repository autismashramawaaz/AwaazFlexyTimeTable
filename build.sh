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

echo "Build completed successfully!" 