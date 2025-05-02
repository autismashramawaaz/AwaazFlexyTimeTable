# Setting Up Git Auto-Push from Render

This guide will help you set up Git operations to work properly from your Render deployment, allowing the application to automatically commit and push changes to your GitHub repository.

## Prerequisites

1. A GitHub repository for your AwaazFlexyTimeTable project
2. A Render.com account with the application deployed

## Setup Instructions

### Step 1: Create a GitHub Personal Access Token

1. Go to your GitHub account settings
2. Select "Developer settings" from the sidebar
3. Click on "Personal access tokens" and then "Tokens (classic)"
4. Click "Generate new token" and select "Generate new token (classic)"
5. Give your token a descriptive name (e.g., "Render Auto-Push")
6. Select the following scopes:
   - `repo` (Full control of private repositories)
7. Click "Generate token"
8. **Important**: Copy the generated token immediately, as you won't be able to see it again!

### Step 2: Configure Render Environment Variables

1. Go to your application's dashboard on Render
2. Click on "Environment" in the left sidebar
3. Add the following environment variables:
   - `GIT_USER_NAME`: A name for Git commits (e.g., "AwaazFlexyTimeTable App")
   - `GIT_USER_EMAIL`: An email address for Git commits (e.g., "app@awaazflexytimetable.onrender.com")
   - `GITHUB_TOKEN`: The personal access token you generated in Step 1
   - `GIT_AUTO_PUSH`: Set to "true" to enable automatic pushing

### Step 3: Test the Configuration

1. After deploying your application with the updated environment variables, visit the testing endpoint:
   - `https://your-app-url.onrender.com/api/git/test`
2. Review the output to ensure Git operations are working correctly
3. Make a change in the application (e.g., add a caregiver) and check if it appears in your GitHub repository

## Troubleshooting

If Git operations are not working as expected, check the following:

1. Verify that all environment variables are set correctly in the Render dashboard
2. Check the application logs for any Git-related errors:
   - Look for "Git operation failed" messages
   - Ensure the GitHub token has the correct permissions
3. Test manually using the `/api/git/test` endpoint and review the response
4. Make sure your repository URL is correct and accessible with the token

## Security Considerations

1. The GitHub token provides access to your repository. Use a token with minimal required permissions.
2. Consider using a dedicated GitHub account for automated operations rather than your personal account.
3. Regularly rotate the GitHub token for security best practices.

## Additional Information

- Git operations are configured in `app.py` in the `git_add_commit` function
- The setup script `setup_git_access.sh` runs during deployment to configure Git credentials
- The `build.sh` script ensures all necessary Git configurations are applied during deployment 