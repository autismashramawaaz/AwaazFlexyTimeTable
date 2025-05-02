from app import git_add_commit
import os

# Create a test file
with open('test_auto_push_2.txt', 'w') as f:
    f.write('Testing auto-push with the app\'s git_add_commit function')

# Use the app's git_add_commit function
git_add_commit('test_auto_push_2.txt', 'Test auto-push via app function')

print("Test completed - check git status") 