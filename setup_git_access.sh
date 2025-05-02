#!/bin/bash
set -e

echo "Setting up Git credentials and SSH access..."

# Set Git credentials from environment variables
if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then
  echo "Configuring Git user name and email..."
  git config --global user.name "$GIT_USER_NAME"
  git config --global user.email "$GIT_USER_EMAIL"
  echo "Git user configuration complete."
else
  echo "Warning: GIT_USER_NAME or GIT_USER_EMAIL environment variables not set."
fi

# Check if this is a Git repository
if [ ! -d .git ]; then
  echo "Initializing Git repository..."
  git init
fi

# Check if origin remote exists and set it if needed
if ! git remote | grep -q "^origin$"; then
  echo "Setting up Git remote..."
  # Get the repository URL from environment variable, or use a default
  REPO_URL="${GIT_REPOSITORY_URL:-https://github.com/autismashramawaaz/AwaazFlexyTimeTable.git}"
  git remote add origin "$REPO_URL"
  echo "Added remote origin: $REPO_URL"
fi

# Get current remote URL
CURRENT_REMOTE_URL=$(git config --get remote.origin.url || echo "none")
echo "Current remote URL: $CURRENT_REMOTE_URL"

# Set up HTTPS credentials if GITHUB_TOKEN is provided
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Configuring Git HTTPS credentials with token..."
  # Extract the repository URL
  REPO_URL=$(git config --get remote.origin.url || echo "")
  
  if [ -z "$REPO_URL" ]; then
    echo "No remote repository URL configured. Using default GitHub repository."
    REPO_URL="https://github.com/autismashramawaaz/AwaazFlexyTimeTable.git"
    git remote set-url origin "$REPO_URL" || git remote add origin "$REPO_URL"
  fi
  
  # If URL starts with https://, update it to include the token
  if [[ $REPO_URL == https://* ]]; then
    # Extract the domain and path
    DOMAIN=$(echo $REPO_URL | cut -d'/' -f3)
    PATH_PART=$(echo $REPO_URL | cut -d'/' -f4-)
    
    # Update the URL with the token
    NEW_URL="https://$GITHUB_TOKEN@$DOMAIN/$PATH_PART"
    git remote set-url origin "$NEW_URL"
    echo "Updated Git remote URL with authentication token."
  else
    echo "Repository URL is not HTTPS, skipping token setup."
  fi
else
  echo "Note: GITHUB_TOKEN environment variable not set. HTTPS authentication not configured."
fi

# Set up SSH access if SSH_PRIVATE_KEY is provided
if [ -n "$SSH_PRIVATE_KEY" ]; then
  echo "Setting up SSH access..."
  
  # Create .ssh directory if it doesn't exist
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  
  # Add GitHub to known hosts
  echo "github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==" >> ~/.ssh/known_hosts
  
  # Save the private key
  echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
  chmod 600 ~/.ssh/id_rsa
  
  # Test SSH connection
  echo "Testing SSH connection to GitHub..."
  ssh -T git@github.com -o StrictHostKeyChecking=no || true
  
  # If the repository URL is HTTPS, switch to SSH if possible
  REPO_URL=$(git config --get remote.origin.url || echo "")
  if [[ $REPO_URL == https://github.com/* ]]; then
    # Convert HTTPS URL to SSH URL
    REPO_PATH=$(echo $REPO_URL | sed 's|https://github.com/||')
    SSH_URL="git@github.com:$REPO_PATH"
    
    git remote set-url origin "$SSH_URL"
    echo "Converted remote URL from HTTPS to SSH: $SSH_URL"
  fi
  
  echo "SSH setup complete."
else
  echo "Note: SSH_PRIVATE_KEY environment variable not set. SSH authentication not configured."
fi

# Make sure we can access the repository
echo "Testing repository access..."
git remote -v

# Try to fetch from the repository (will fail if credentials are incorrect)
if git fetch origin --depth=1 2>/dev/null; then
  echo "Repository access successful."
else
  echo "Warning: Unable to access the repository. Check your credentials and permissions."
fi

echo "Git access setup complete." 