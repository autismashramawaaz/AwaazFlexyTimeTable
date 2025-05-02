#!/usr/bin/env python3
import os
import subprocess
import sys

def print_header(message):
    """Print a header with the message."""
    print("\n" + "="*80)
    print(f"  {message}")
    print("="*80)

def run_command(cmd, check=True):
    """Run a command and print its output."""
    try:
        result = subprocess.run(cmd, check=check, text=True, capture_output=True)
        print(f"Command: {' '.join(cmd)}")
        print(f"Exit code: {result.returncode}")
        if result.stdout:
            print("Standard output:")
            print(result.stdout)
        if result.stderr:
            print("Standard error:")
            print(result.stderr)
        return result
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}")
        print(f"Exit code: {e.returncode}")
        if e.stdout:
            print("Standard output:")
            print(e.stdout)
        if e.stderr:
            print("Standard error:")
            print(e.stderr)
        if check:
            sys.exit(1)
        return e

def main():
    print_header("Environment Information")
    print(f"Environment: {os.environ.get('FLASK_ENV', 'not set')}")
    print(f"GIT_AUTO_PUSH: {os.environ.get('GIT_AUTO_PUSH', 'not set')}")
    print(f"GIT_USER_NAME: {os.environ.get('GIT_USER_NAME', 'not set')}")
    print(f"GIT_USER_EMAIL: {os.environ.get('GIT_USER_EMAIL', 'not set')}")
    
    print_header("Current Git Configuration")
    run_command(["git", "config", "--list"])
    
    print_header("Setting Git Configuration")
    git_user_name = os.environ.get('GIT_USER_NAME', 'AwaazFlexyTimeTable')
    git_user_email = os.environ.get('GIT_USER_EMAIL', 'app@awaazflexytimetable.onrender.com')
    
    print(f"Setting user.name to: {git_user_name}")
    run_command(["git", "config", "user.name", git_user_name])
    
    print(f"Setting user.email to: {git_user_email}")
    run_command(["git", "config", "user.email", git_user_email])
    
    print_header("Verifying Git Configuration")
    run_command(["git", "config", "--list"])
    
    print_header("Testing Git Operations")
    test_file = "test_git_render.txt"
    with open(test_file, "w") as f:
        f.write(f"Test file created at: {os.environ.get('RENDER_EXTERNAL_URL', 'local')}\n")
        f.write(f"GIT_AUTO_PUSH: {os.environ.get('GIT_AUTO_PUSH', 'not set')}\n")
        f.write(f"GIT_USER_NAME: {os.environ.get('GIT_USER_NAME', 'not set')}\n")
        f.write(f"GIT_USER_EMAIL: {os.environ.get('GIT_USER_EMAIL', 'not set')}\n")
    
    print(f"Created test file: {test_file}")
    run_command(["git", "add", test_file])
    run_command(["git", "commit", "-m", "Test commit from Render environment"])
    
    if os.environ.get('GIT_AUTO_PUSH', '').lower() == 'true':
        print("Auto-push is enabled, pushing to remote...")
        run_command(["git", "push", "origin", "master"], check=False)
    
    print_header("Test Completed")

if __name__ == "__main__":
    main() 