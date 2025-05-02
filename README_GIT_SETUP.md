# Setting Up Git Integration on Render

This document explains how to set up Git integration for the AwaazFlexyTimeTable application running on Render.

## Problem Identified

The diagnostic tool identified the following issues:

```
Git Push Access Test: Failed
Error: fatal: could not read Username for 'https://github.com': No such device or address
```

This error occurs because GitHub requires authentication for push operations, but the necessary credentials are missing.

## Solution

### 1. Create a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set the following:
   - Token name: `AwaazFlexyTimeTable-Render-Access`
   - Expiration: Set an appropriate expiration (e.g., 90 days or 1 year)
   - Repository access: Select "Only select repositories" and choose the AwaazFlexyTimeTable repository
   - Permissions: Grant at minimum "Contents: Read and write" permission

### 2. Configure Render Environment Variables

1. Go to your Render dashboard → AwaazFlexyTimeTable service → Environment
2. Add or update the following environment variables:

   | Key | Value | Description |
   |-----|-------|-------------|
   | `GITHUB_TOKEN` | [Your token from step 1] | GitHub personal access token |
   | `GIT_USER_NAME` | "AwaazFlexyTimeTable App" | Name to use for Git commits |
   | `GIT_USER_EMAIL` | Your email or app@awaazflexytimetable.onrender.com | Email to use for Git commits |
   | `GIT_AUTO_PUSH` | true | Enable automatic pushing of commits |
   | `GIT_REPOSITORY_URL` | https://github.com/autismashramawaaz/AwaazFlexyTimeTable.git | GitHub repository URL |

3. Save the changes and restart the service

### 3. Run the Setup Script

When your application starts on Render, it should automatically run the setup script, but you can also manually run it:

```bash
chmod +x setup_git_access.sh
./setup_git_access.sh
```

### 4. Verify the Setup

1. Run the diagnostic tool by visiting: `https://awaazflexytimetable.onrender.com/api/git/diagnose`
2. Check the output to confirm:
   - Git user is configured
   - GitHub token is set
   - Repository access is working
   - Push access is successful

## Troubleshooting

### Common Issues:

1. **"fatal: could not read Username for 'https://github.com'"**
   - The GITHUB_TOKEN environment variable is missing or invalid
   - Solution: Create a new token with proper permissions and update the GITHUB_TOKEN environment variable

2. **"Repository not found" or "Authentication failed"**
   - The GitHub token doesn't have access to the repository
   - Solution: Check that the token has the correct permissions for the repository

3. **"detached HEAD" state**
   - The Git repository is in an inconsistent state
   - Solution: Run the setup script which will automatically fix this issue

4. **Commits not being pushed automatically**
   - The GIT_AUTO_PUSH environment variable might be set to "false" or not set
   - Solution: Set GIT_AUTO_PUSH=true in your environment variables

## Security Considerations

- **Never commit the GitHub token to your repository**
- The token should only be stored as an environment variable in Render
- Regularly rotate your GitHub tokens (create new ones and delete old ones)
- Use the most restrictive permissions possible for your token (only repository contents, only the specific repository)

For further assistance, contact the development team or refer to the [GitHub documentation on authentication](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). 