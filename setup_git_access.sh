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

# Set up HTTPS credentials if GITHUB_TOKEN is provided
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Configuring Git HTTPS credentials with token..."
  # Extract the repository URL
  REPO_URL=$(git config --get remote.origin.url)
  
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
  REPO_URL=$(git config --get remote.origin.url)
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

echo "Git access setup complete." 