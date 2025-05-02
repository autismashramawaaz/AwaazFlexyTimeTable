#!/bin/bash
# Script to set up Git access for Render deployments

set -e # Exit on error

echo "Setting up Git access..."

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Please install Git and try again."
    exit 1
fi

# Configure Git user
if [ -n "$GIT_USER_NAME" ]; then
    echo "Setting Git user.name to: $GIT_USER_NAME"
    git config --global user.name "$GIT_USER_NAME"
else
    echo "Setting default Git user.name: AwaazFlexyTimeTable App"
    git config --global user.name "AwaazFlexyTimeTable App"
fi

if [ -n "$GIT_USER_EMAIL" ]; then
    echo "Setting Git user.email to: $GIT_USER_EMAIL"
    git config --global user.email "$GIT_USER_EMAIL"
else
    echo "Setting default Git user.email: app@awaazflexytimetable.onrender.com"
    git config --global user.email "app@awaazflexytimetable.onrender.com"
fi

# Check if we're in a Git repository
if [ ! -d ".git" ]; then
    echo "Not in a Git repository. Initializing..."
    git init
fi

# Set up or update remote repository URL with GitHub token
if [ -n "$GIT_REPOSITORY_URL" ]; then
    echo "Setting up remote repository URL: $GIT_REPOSITORY_URL"
    
    # Check if origin remote exists
    if git remote | grep -q "^origin$"; then
        echo "Remote 'origin' already exists. Updating URL..."
        git remote set-url origin "$GIT_REPOSITORY_URL"
    else
        echo "Adding remote 'origin'..."
        git remote add origin "$GIT_REPOSITORY_URL"
    fi
    
    # If GitHub token is available, update URL to include it
    if [ -n "$GITHUB_TOKEN" ] && [[ "$GIT_REPOSITORY_URL" == *"github.com"* ]]; then
        echo "GitHub token found. Configuring authentication..."
        # Extract the repo part from the URL (after github.com/)
        REPO_PART=$(echo "$GIT_REPOSITORY_URL" | sed -E 's|https://github.com/||')
        
        # Create new URL with token
        NEW_URL="https://${GITHUB_TOKEN}@github.com/${REPO_PART}"
        
        echo "Setting remote URL with GitHub token authentication..."
        git remote set-url origin "$NEW_URL"
    else
        echo "No GitHub token found. Authentication may fail for HTTPS URLs."
    fi
else
    echo "Warning: GIT_REPOSITORY_URL not set. Git push operations may fail."
fi

# Try to fetch the latest code (will fail if authentication issues)
echo "Attempting to fetch from remote repository..."
if git fetch origin --quiet 2>/dev/null; then
    echo "Successfully fetched from remote repository."
else
    echo "Warning: Could not fetch from remote repository. This may be due to authentication issues."
fi

# Check current branch and fix detached HEAD if needed
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
    echo "Detected detached HEAD state. Attempting to check out master branch..."
    
    # Try to create and check out master branch
    if ! git checkout master 2>/dev/null; then
        echo "Master branch doesn't exist. Creating it..."
        git checkout -b master
    fi
else
    echo "Current branch: $CURRENT_BRANCH"
fi

# Verify the setup
echo "Git configuration:"
git config --list

echo "Git remote URLs:"
git remote -v

echo "Git setup completed." 