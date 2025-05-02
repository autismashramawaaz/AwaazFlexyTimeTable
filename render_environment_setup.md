# Setting Up GitHub Token Authentication for Render

This guide provides detailed instructions for setting up GitHub token authentication for the AwaazFlexyTimeTable application when deployed on Render.

## Prerequisites

- A GitHub account with access to the repository
- Admin access to your Render dashboard
- Basic understanding of Git and environment variables

## Steps to Set Up GitHub Token

### 1. Create a GitHub Personal Access Token (PAT)

1. Log in to your GitHub account.
2. Click on your profile picture in the top-right corner.
3. Select **Settings** from the dropdown menu.
4. In the left sidebar, click on **Developer settings**.
5. Select **Personal access tokens** → **Tokens (classic)**.
6. Click **Generate new token** → **Generate new token (classic)**.
7. Enter a descriptive name for your token (e.g., "AwaazFlexyTimeTable Render Deployment").
8. Select the following permissions:
   - **repo** (Full control of private repositories)
   - If your repository is public, you might only need **public_repo** access
9. Click **Generate token**.
10. **IMPORTANT**: Copy the generated token immediately. GitHub will only show it once.

### 2. Add the Token to Render Environment Variables

1. Log in to your Render dashboard.
2. Navigate to your AwaazFlexyTimeTable service.
3. Click on **Environment** in the left sidebar.
4. Add the following environment variables:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `GIT_USER_NAME`: The name to use for Git commits (e.g., "AwaazFlexyTimeTable App")
   - `GIT_USER_EMAIL`: The email to use for Git commits (e.g., "app@awaazflexytimetable.onrender.com")
   - `GIT_AUTO_PUSH`: Set to "true" to enable automatic pushing of commits
   - `GIT_REPOSITORY_URL`: Your repository URL (e.g., "https://github.com/autismashramawaaz/AwaazFlexyTimeTable.git")
5. Click **Save Changes**.

### 3. Verify the Setup

After adding the environment variables, you should verify that the setup is working correctly:

1. **Using the Diagnostic Tool:**
   
   The application includes diagnostic tools to help you verify and troubleshoot your Git setup:
   
   ```bash
   # Run the diagnostic tool with the wrapper script
   ./git_diagnosis.sh
   
   # Or directly using Python
   python3 diagnose_git.py
   ```
   
   This will check your token authentication, Git configuration, and repository access.

2. **Manual Verification:**
   
   You can also verify the setup by making a small change to your application through the web interface and checking if the change is committed and pushed to GitHub.

## Troubleshooting

### Common Issues

1. **"Authentication failed" error:**
   - Check if your GitHub token has expired (tokens can expire)
   - Verify the token has the correct permissions
   - Make sure the token is correctly entered in your environment variables

2. **"Permission denied" error:**
   - Ensure your token has access to the repository
   - If it's a private repository, make sure the token has the "repo" permission

3. **"Repository not found" error:**
   - Verify that the repository URL is correct
   - Check if you have access to the repository with your GitHub account

### Using the Diagnostic Tool

The application includes a comprehensive diagnostic tool that can help identify and fix common issues:

```bash
./git_diagnosis.sh
```

This tool will:
- Check if your GitHub token is configured correctly
- Verify that your Git identity is set up
- Test access to your GitHub repository
- Attempt to diagnose and fix common issues
- Provide a detailed report of findings and recommendations

## Security Considerations

- Never commit your GitHub token to your repository or include it in your code.
- Regularly rotate your GitHub token for security best practices.
- Use the minimum required permissions for your token.
- Consider using repository-specific deploy keys for production environments.
- Monitor GitHub account activity for unauthorized access.

## Updating Your Token

GitHub tokens may expire or need to be rotated for security reasons. To update your token:

1. Generate a new token on GitHub.
2. Update the `GITHUB_TOKEN` environment variable in your Render dashboard.
3. No redeployment is needed as the application reads the token from environment variables at runtime.

## Additional Resources

- [GitHub documentation on creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Render documentation on environment variables](https://render.com/docs/environment-variables)
- [Best practices for securing GitHub tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation) 