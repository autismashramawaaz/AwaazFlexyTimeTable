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

# Set up Git credentials and access
echo "Setting up Git credentials and access..."
if [ -f "setup_git_access.sh" ]; then
  echo "Running Git setup script..."
  bash setup_git_access.sh
else
  echo "Warning: setup_git_access.sh not found. Git operations may not work correctly."
  
  # Fallback: Basic Git configuration
  if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then
    echo "Configuring Git user name and email..."
    git config --global user.name "$GIT_USER_NAME"
    git config --global user.email "$GIT_USER_EMAIL"
  fi
fi

echo "Build completed successfully!" 