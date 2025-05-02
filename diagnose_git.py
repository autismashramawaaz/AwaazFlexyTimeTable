#!/usr/bin/env python3
import os
import subprocess
import sys
import json
from datetime import datetime

def print_section(title):
    """Print a section title."""
    print("\n" + "="*80)
    print(f" {title}")
    print("="*80)

def run_command(cmd, check=False, show_command=True):
    """Run a command and return the result."""
    if show_command:
        print(f"\n$ {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=check)
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(f"ERROR: {result.stderr}")
        return result
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code {e.returncode}")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(f"ERROR: {e.stderr}")
        return e
    except Exception as e:
        print(f"Exception: {e}")
        return None

def check_environment():
    """Check environment variables."""
    print_section("Environment Variables")
    
    # Git-related environment variables
    env_vars = {
        "GIT_USER_NAME": os.environ.get("GIT_USER_NAME", "Not set"),
        "GIT_USER_EMAIL": os.environ.get("GIT_USER_EMAIL", "Not set"),
        "GIT_AUTO_PUSH": os.environ.get("GIT_AUTO_PUSH", "Not set"),
        "GIT_REMOTE": os.environ.get("GIT_REMOTE", "Not set"),
        "GIT_BRANCH": os.environ.get("GIT_BRANCH", "Not set"),
        "GIT_REPOSITORY_URL": os.environ.get("GIT_REPOSITORY_URL", "Not set"),
        "GITHUB_TOKEN": "Set" if os.environ.get("GITHUB_TOKEN") else "Not set",
        "SSH_PRIVATE_KEY": "Set" if os.environ.get("SSH_PRIVATE_KEY") else "Not set",
        "FLASK_ENV": os.environ.get("FLASK_ENV", "Not set"),
        "RENDER_EXTERNAL_URL": os.environ.get("RENDER_EXTERNAL_URL", "Not set"),
        "RENDER_SERVICE_ID": os.environ.get("RENDER_SERVICE_ID", "Not set")
    }
    
    # Print environment variables
    for var, value in env_vars.items():
        print(f"{var}: {value}")

def check_git_installation():
    """Check Git installation."""
    print_section("Git Installation")
    
    # Check Git version
    run_command(["git", "--version"])
    
    # Check Git configuration
    run_command(["git", "config", "--list"])

def check_git_repo():
    """Check if current directory is a Git repository."""
    print_section("Git Repository")
    
    # Check if .git directory exists
    if os.path.isdir(".git"):
        print("✓ .git directory exists")
    else:
        print("✗ .git directory not found")
        return False
    
    # Check Git status
    run_command(["git", "status"])
    
    # Check remotes
    run_command(["git", "remote", "-v"])
    
    return True

def check_git_access():
    """Check access to Git remote repository."""
    print_section("Git Remote Access")
    
    # Get current remote URL
    result = run_command(["git", "config", "--get", "remote.origin.url"], show_command=False)
    remote_url = result.stdout.strip() if result and result.stdout else None
    
    if not remote_url:
        print("✗ No remote URL configured")
        return False
    
    print(f"Remote URL: {remote_url}")
    
    # Try to list remote branches
    print("\nAttempting to list remote branches:")
    run_command(["git", "ls-remote", "--heads", "origin"])
    
    return True

def check_push_access():
    """Check if we can push to the remote repository."""
    print_section("Git Push Access Test")
    
    # Create a test file
    test_file = f"git_test_{datetime.now().strftime('%Y%m%d%H%M%S')}.txt"
    with open(test_file, "w") as f:
        f.write(f"Git diagnostic test\n")
        f.write(f"Created at: {datetime.now().isoformat()}\n")
        f.write(f"Environment: {os.environ.get('FLASK_ENV', 'unknown')}\n")
        f.write(f"Host: {os.environ.get('RENDER_EXTERNAL_URL', 'unknown')}\n")
    
    print(f"Created test file: {test_file}")
    
    # Add and commit
    run_command(["git", "add", test_file])
    run_command(["git", "commit", "-m", f"Diagnostic test commit at {datetime.now().isoformat()}"])
    
    # Try to push
    print("\nAttempting to push:")
    auto_push = os.environ.get("GIT_AUTO_PUSH", "").lower() == "true"
    if auto_push:
        result = run_command(["git", "push", "origin", "master"], check=False)
        return result.returncode == 0
    else:
        print("Auto-push is disabled, skipping push test")
        return None

def fix_remote_url():
    """Try to fix the remote URL using the GITHUB_TOKEN."""
    print_section("Fixing Remote URL")
    
    github_token = os.environ.get("GITHUB_TOKEN")
    repo_url = os.environ.get("GIT_REPOSITORY_URL")
    
    if not github_token:
        print("✗ GITHUB_TOKEN not set, cannot fix remote URL")
        return False
    
    if not repo_url:
        print("✗ GIT_REPOSITORY_URL not set, cannot fix remote URL")
        return False
    
    # Get current remote URL
    result = run_command(["git", "config", "--get", "remote.origin.url"], show_command=False)
    current_url = result.stdout.strip() if result and result.stdout else None
    
    if current_url:
        print(f"Current remote URL: {current_url}")
    else:
        print("No remote URL configured, setting it now...")
        run_command(["git", "remote", "add", "origin", repo_url])
        print(f"Added remote origin: {repo_url}")
    
    # Update the URL to include the token
    if repo_url.startswith("https://github.com/"):
        new_url = f"https://{github_token}@github.com/{repo_url.split('github.com/')[1]}"
        run_command(["git", "remote", "set-url", "origin", new_url])
        print(f"Updated remote URL to use GitHub token for authentication")
        return True
    else:
        print("Repository URL is not a GitHub HTTPS URL, cannot fix")
        return False

def create_summary(results):
    """Create a summary of the diagnostic results."""
    print_section("Diagnostic Summary")
    
    for key, value in results.items():
        status = "✓" if value else "✗"
        if value is None:
            status = "⚠️"
        print(f"{status} {key}")
    
    if all(v for v in results.values() if v is not None):
        print("\nAll checks passed! Git is configured correctly.")
    else:
        print("\nSome checks failed. Please review the output above for issues.")

def main():
    """Run the diagnostic checks."""
    print_section("Git Diagnostics")
    print(f"Date/Time: {datetime.now().isoformat()}")
    print(f"Working Directory: {os.getcwd()}")
    
    results = {}
    
    # Check environment
    check_environment()
    
    # Check Git installation
    check_git_installation()
    
    # Check Git repository
    results["Git Repository"] = check_git_repo()
    
    # Check Git access
    results["Git Remote Access"] = check_git_access()
    
    # If access check failed, try to fix the remote URL
    if not results["Git Remote Access"]:
        results["Fix Remote URL"] = fix_remote_url()
        
        # Check access again after fixing
        if results.get("Fix Remote URL"):
            results["Git Remote Access (After Fix)"] = check_git_access()
    
    # Check push access
    results["Git Push Access"] = check_push_access()
    
    # Create summary
    create_summary(results)

if __name__ == "__main__":
    main() 