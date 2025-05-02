import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
import json
from datetime import datetime
import shutil
import subprocess
from dotenv import load_dotenv
import sys

# Load environment variables from .env file if it exists
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key')
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'images', 'caregivers')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['GIT_AUTO_PUSH'] = os.environ.get('GIT_AUTO_PUSH', 'false').lower() == 'true'
app.config['GIT_REMOTE'] = os.environ.get('GIT_REMOTE', 'origin')
app.config['GIT_BRANCH'] = os.environ.get('GIT_BRANCH', 'master')
app.config['ENVIRONMENT'] = os.environ.get('FLASK_ENV', 'production')

# Ensure data directories exist
os.makedirs('data/caregivers', exist_ok=True)
os.makedirs('data/categories', exist_ok=True)
os.makedirs('data/activities', exist_ok=True)
os.makedirs('data/templates', exist_ok=True)
os.makedirs('data/calendars', exist_ok=True)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# After app initialization

git_user_name = os.environ.get('GIT_USER_NAME')
git_user_email = os.environ.get('GIT_USER_EMAIL')
if git_user_name and git_user_email:
    try:
        subprocess.run(["git", "config", "--global", "user.name", git_user_name], check=True)
        subprocess.run(["git", "config", "--global", "user.email", git_user_email], check=True)
    except Exception as e:
        print(f"Failed to configure git credentials: {e}")

# Git utility functions
def git_add_commit(file_path, message):
    """Add and commit a file to git, then push if configured"""
    # Skip Git operations in production environment or if Git is not available
    # We're allowing Git in production now, so comment this out
    # if app.config['ENVIRONMENT'] == 'production':
    #    print(f"Production environment detected, skipping Git operations for {file_path}")
    #    return
        
    # Get the auto-push setting directly from environment for reliability
    auto_push = os.environ.get('GIT_AUTO_PUSH', 'false').lower() == 'true'
    print(f"Git auto-push setting from environment: {auto_push}")
    
    try:
        # Configure Git user info for this commit if environment variables are available
        git_user_name = os.environ.get('GIT_USER_NAME', 'AwaazFlexyTimeTable')
        git_user_email = os.environ.get('GIT_USER_EMAIL', 'app@awaazflexytimetable.onrender.com')
        
        # Set local Git configuration for this repository
        subprocess.run(["git", "config", "user.name", git_user_name], check=True)
        subprocess.run(["git", "config", "user.email", git_user_email], check=True)
        
        # Check if we're in a git repository
        try:
            subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], check=True, 
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError:
            print("Not in a git repository. Initializing...")
            subprocess.run(["git", "init"], check=True)
            
            # Set up remote if GIT_REPOSITORY_URL is provided
            repo_url = os.environ.get('GIT_REPOSITORY_URL')
            if repo_url:
                try:
                    # Check if origin remote exists
                    result = subprocess.run(["git", "remote"], check=True, 
                                          stdout=subprocess.PIPE, text=True)
                    remotes = result.stdout.strip().split('\n')
                    
                    if 'origin' not in remotes:
                        print(f"Adding remote origin: {repo_url}")
                        subprocess.run(["git", "remote", "add", "origin", repo_url], check=True)
                    else:
                        print("Remote origin already exists. Setting URL...")
                        subprocess.run(["git", "remote", "set-url", "origin", repo_url], check=True)
                except Exception as e:
                    print(f"Error setting up remote: {e}")
        
        # Use subprocess instead of os.system for better control
        subprocess.run(["git", "add", file_path], check=True)
        
        # Check if there are changes to commit
        status_result = subprocess.run(
            ["git", "status", "--porcelain", file_path],
            check=True,
            capture_output=True,
            text=True
        )
        
        if not status_result.stdout.strip():
            print(f"No changes to commit for {file_path}")
            return
            
        commit_result = subprocess.run(["git", "commit", "-m", message], check=True,
                                     capture_output=True, text=True)
        print(commit_result.stdout)
        
        # Push changes if auto push is enabled
        if auto_push:
            remote = os.environ.get('GIT_REMOTE', 'origin')
            branch = os.environ.get('GIT_BRANCH', 'master')
            
            # Make sure the remote exists
            remote_result = subprocess.run(["git", "remote", "-v"], 
                                         capture_output=True, text=True)
            print(f"Remotes: {remote_result.stdout}")
            
            if remote not in remote_result.stdout:
                repo_url = os.environ.get('GIT_REPOSITORY_URL')
                if repo_url:
                    print(f"Remote {remote} not found. Adding it with URL: {repo_url}")
                    subprocess.run(["git", "remote", "add", remote, repo_url], check=True)
                else:
                    print(f"Remote {remote} not found and GIT_REPOSITORY_URL not set. Cannot push.")
                    return
            
            print(f"Auto-push enabled, pushing to {remote}/{branch}...")
            
            # Check if we need to set up HTTPS credentials for GitHub
            github_token = os.environ.get('GITHUB_TOKEN')
            if github_token:
                remote_url = subprocess.run(
                    ["git", "config", "--get", f"remote.{remote}.url"],
                    capture_output=True, text=True, check=False
                ).stdout.strip()
                
                if remote_url.startswith('https://github.com/'):
                    # Update URL to include token
                    new_url = f"https://{github_token}@github.com/{remote_url.split('github.com/')[1]}"
                    subprocess.run(["git", "remote", "set-url", remote, new_url], check=True)
                    print(f"Updated remote URL to use GitHub token for authentication")
            
            try:
                push_result = subprocess.run(
                    ["git", "push", remote, branch],
                    check=True,
                    capture_output=True,
                    text=True
                )
                print(push_result.stdout)
                print(f"Successfully pushed changes to {remote}/{branch}")
            except subprocess.CalledProcessError as e:
                print(f"Push failed: {e}")
                print(f"Error output: {e.stderr}")
                
                # Try to diagnose the issue
                if "not a git repository" in e.stderr:
                    print("The remote repository is not properly configured. Check your GIT_REPOSITORY_URL setting.")
                elif "Permission denied" in e.stderr:
                    print("Permission denied. Check your GitHub token or SSH key.")
                elif "Authentication failed" in e.stderr:
                    print("Authentication failed. Check your GitHub token.")
                elif "Could not read from remote repository" in e.stderr:
                    print("Could not access the remote repository. Check if the URL is correct and accessible.")
        else:
            print("Auto-push disabled, skipping push")
            
    except subprocess.CalledProcessError as e:
        print(f"Git operation failed: {e}")
        if hasattr(e, 'stderr') and e.stderr:
            print(f"Error details: {e.stderr}")
    except Exception as e:
        print(f"Error in git operations: {e}")

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# API Routes for Caregivers
@app.route('/api/caregivers', methods=['GET'])
def get_caregivers():
    caregivers = []
    for filename in os.listdir('data/caregivers'):
        if filename.endswith('.json'):
            with open(os.path.join('data/caregivers', filename), 'r') as f:
                caregiver = json.load(f)
                caregivers.append(caregiver)
    return jsonify(caregivers)

@app.route('/api/caregivers/<id>', methods=['GET'])
def get_caregiver(id):
    try:
        with open(os.path.join('data/caregivers', f'{id}.json'), 'r') as f:
            caregiver = json.load(f)
        return jsonify(caregiver)
    except FileNotFoundError:
        return jsonify({"error": "Caregiver not found"}), 404

@app.route('/api/caregivers', methods=['POST'])
def create_caregiver():
    data = request.form.to_dict()
    id = datetime.now().strftime('%Y%m%d%H%M%S')
    data['id'] = id
    
    # Handle image upload
    if 'picture' in request.files:
        file = request.files['picture']
        if file.filename:
            filename = secure_filename(file.filename)
            extension = os.path.splitext(filename)[1]
            image_filename = f"{id}{extension}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
            file.save(file_path)
            data['picture'] = os.path.join('images', 'caregivers', image_filename)
    
    # Process location rates
    if 'location_rates_json' in data:
        try:
            data['location_rates'] = json.loads(data['location_rates_json'])
            del data['location_rates_json']
            # Delete the individual location fields to prevent duplication
            if 'location_names[]' in data:
                del data['location_names[]']
            if 'location_rates[]' in data:
                del data['location_rates[]']
        except:
            # If there's an error processing the JSON, just ignore it
            if 'location_rates_json' in data:
                del data['location_rates_json']
    
    # If default_hourly_rate is provided, make it the primary rate for backward compatibility
    if 'default_hourly_rate' in data:
        data['hourly_rate'] = data['default_hourly_rate']
    
    with open(os.path.join('data/caregivers', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/caregivers/{id}.json', f"Added caregiver {data.get('name', id)}")
    
    return jsonify(data), 201

@app.route('/api/caregivers/<id>', methods=['PUT'])
def update_caregiver(id):
    data = request.form.to_dict()
    data['id'] = id
    
    try:
        with open(os.path.join('data/caregivers', f'{id}.json'), 'r') as f:
            existing = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Caregiver not found"}), 404
    
    # Handle image upload
    if 'picture' in request.files:
        file = request.files['picture']
        if file.filename:
            # Remove old picture if exists
            if 'picture' in existing and existing['picture'] and os.path.exists(os.path.join('static', existing['picture'])):
                os.remove(os.path.join('static', existing['picture']))
            
            filename = secure_filename(file.filename)
            extension = os.path.splitext(filename)[1]
            image_filename = f"{id}{extension}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
            file.save(file_path)
            data['picture'] = os.path.join('images', 'caregivers', image_filename)
        else:
            # Keep existing picture
            data['picture'] = existing.get('picture', '')
    else:
        # Keep existing picture
        data['picture'] = existing.get('picture', '')
    
    # Process location rates
    if 'location_rates_json' in data:
        try:
            data['location_rates'] = json.loads(data['location_rates_json'])
            del data['location_rates_json']
            # Delete the individual location fields to prevent duplication
            if 'location_names[]' in data:
                del data['location_names[]']
            if 'location_rates[]' in data:
                del data['location_rates[]']
        except:
            # If there's an error processing the JSON, just ignore it
            if 'location_rates_json' in data:
                del data['location_rates_json']
    
    # If default_hourly_rate is provided, make it the primary rate for backward compatibility
    if 'default_hourly_rate' in data:
        data['hourly_rate'] = data['default_hourly_rate']
    
    with open(os.path.join('data/caregivers', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/caregivers/{id}.json', f"Updated caregiver {data.get('name', id)}")
    
    return jsonify(data)

@app.route('/api/caregivers/<id>', methods=['DELETE'])
def delete_caregiver(id):
    try:
        file_path = os.path.join('data/caregivers', f'{id}.json')
        with open(file_path, 'r') as f:
            caregiver = json.load(f)
        
        # Remove profile picture if exists
        if 'picture' in caregiver and caregiver['picture'] and os.path.exists(os.path.join('static', caregiver['picture'])):
            os.remove(os.path.join('static', caregiver['picture']))
        
        os.remove(file_path)
        git_add_commit(file_path, f"Deleted caregiver {caregiver.get('name', id)}")
        
        return jsonify({"message": "Caregiver deleted successfully"})
    except FileNotFoundError:
        return jsonify({"error": "Caregiver not found"}), 404

# API Routes for Categories
@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = []
    for filename in os.listdir('data/categories'):
        if filename.endswith('.json'):
            with open(os.path.join('data/categories', filename), 'r') as f:
                category = json.load(f)
                categories.append(category)
    return jsonify(categories)

@app.route('/api/categories/<id>', methods=['GET'])
def get_category(id):
    try:
        with open(os.path.join('data/categories', f'{id}.json'), 'r') as f:
            category = json.load(f)
        return jsonify(category)
    except FileNotFoundError:
        return jsonify({"error": "Category not found"}), 404

@app.route('/api/categories', methods=['POST'])
def create_category():
    data = request.get_json()
    id = datetime.now().strftime('%Y%m%d%H%M%S')
    data['id'] = id
    
    with open(os.path.join('data/categories', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/categories/{id}.json', f"Added category {data.get('name', id)}")
    
    return jsonify(data), 201

@app.route('/api/categories/<id>', methods=['PUT'])
def update_category(id):
    data = request.get_json()
    data['id'] = id
    
    try:
        with open(os.path.join('data/categories', f'{id}.json'), 'r') as f:
            existing = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Category not found"}), 404
    
    with open(os.path.join('data/categories', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/categories/{id}.json', f"Updated category {data.get('name', id)}")
    
    return jsonify(data)

@app.route('/api/categories/<id>', methods=['DELETE'])
def delete_category(id):
    try:
        file_path = os.path.join('data/categories', f'{id}.json')
        with open(file_path, 'r') as f:
            category = json.load(f)
        
        os.remove(file_path)
        git_add_commit(file_path, f"Deleted category {category.get('name', id)}")
        
        return jsonify({"message": "Category deleted successfully"})
    except FileNotFoundError:
        return jsonify({"error": "Category not found"}), 404

# API Routes for Activities
@app.route('/api/activities', methods=['GET'])
def get_activities():
    category_id = request.args.get('category_id')
    activities = []
    
    for filename in os.listdir('data/activities'):
        if filename.endswith('.json'):
            with open(os.path.join('data/activities', filename), 'r') as f:
                activity = json.load(f)
                if not category_id or activity.get('category_id') == category_id:
                    activities.append(activity)
                    
    return jsonify(activities)

@app.route('/api/activities/<id>', methods=['GET'])
def get_activity(id):
    try:
        with open(os.path.join('data/activities', f'{id}.json'), 'r') as f:
            activity = json.load(f)
        return jsonify(activity)
    except FileNotFoundError:
        return jsonify({"error": "Activity not found"}), 404

@app.route('/api/activities', methods=['POST'])
def create_activity():
    data = request.get_json()
    id = datetime.now().strftime('%Y%m%d%H%M%S')
    data['id'] = id
    
    with open(os.path.join('data/activities', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/activities/{id}.json', f"Added activity {data.get('name', id)}")
    
    return jsonify(data), 201

@app.route('/api/activities/<id>', methods=['PUT'])
def update_activity(id):
    data = request.get_json()
    data['id'] = id
    
    try:
        with open(os.path.join('data/activities', f'{id}.json'), 'r') as f:
            existing = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Activity not found"}), 404
    
    with open(os.path.join('data/activities', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/activities/{id}.json', f"Updated activity {data.get('name', id)}")
    
    return jsonify(data)

@app.route('/api/activities/<id>', methods=['DELETE'])
def delete_activity(id):
    try:
        file_path = os.path.join('data/activities', f'{id}.json')
        with open(file_path, 'r') as f:
            activity = json.load(f)
        
        os.remove(file_path)
        git_add_commit(file_path, f"Deleted activity {activity.get('name', id)}")
        
        return jsonify({"message": "Activity deleted successfully"})
    except FileNotFoundError:
        return jsonify({"error": "Activity not found"}), 404

# API Routes for Templates
@app.route('/api/templates', methods=['GET'])
def get_templates():
    templates = []
    for filename in os.listdir('data/templates'):
        if filename.endswith('.json'):
            with open(os.path.join('data/templates', filename), 'r') as f:
                template = json.load(f)
                templates.append(template)
    return jsonify(templates)

@app.route('/api/templates/<id>', methods=['GET'])
def get_template(id):
    try:
        with open(os.path.join('data/templates', f'{id}.json'), 'r') as f:
            template = json.load(f)
        return jsonify(template)
    except FileNotFoundError:
        return jsonify({"error": "Template not found"}), 404

@app.route('/api/templates', methods=['POST'])
def create_template():
    data = request.get_json()
    id = datetime.now().strftime('%Y%m%d%H%M%S')
    data['id'] = id
    
    # Initialize empty weekly schedule with 2-hour blocks
    if 'schedule' not in data:
        data['schedule'] = {
            'Monday': {'8-10': {}, '10-12': {}, '12-14': {}, '14-16': {}, '16-18': {}, '18-20': {}, '20-22': {}},
            'Tuesday': {'8-10': {}, '10-12': {}, '12-14': {}, '14-16': {}, '16-18': {}, '18-20': {}, '20-22': {}},
            'Wednesday': {'8-10': {}, '10-12': {}, '12-14': {}, '14-16': {}, '16-18': {}, '18-20': {}, '20-22': {}},
            'Thursday': {'8-10': {}, '10-12': {}, '12-14': {}, '14-16': {}, '16-18': {}, '18-20': {}, '20-22': {}},
            'Friday': {'8-10': {}, '10-12': {}, '12-14': {}, '14-16': {}, '16-18': {}, '18-20': {}, '20-22': {}},
            'Saturday': {'8-10': {}, '10-12': {}, '12-14': {}, '14-16': {}, '16-18': {}, '18-20': {}, '20-22': {}},
            'Sunday': {'8-10': {}, '10-12': {}, '12-14': {}, '14-16': {}, '16-18': {}, '18-20': {}, '20-22': {}}
        }
    
    with open(os.path.join('data/templates', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/templates/{id}.json', f"Added template {data.get('name', id)}")
    
    return jsonify(data), 201

@app.route('/api/templates/<id>', methods=['PUT'])
def update_template(id):
    data = request.get_json()
    data['id'] = id
    
    try:
        with open(os.path.join('data/templates', f'{id}.json'), 'r') as f:
            existing = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Template not found"}), 404
    
    with open(os.path.join('data/templates', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/templates/{id}.json', f"Updated template {data.get('name', id)}")
    
    return jsonify(data)

@app.route('/api/templates/<id>', methods=['DELETE'])
def delete_template(id):
    try:
        file_path = os.path.join('data/templates', f'{id}.json')
        with open(file_path, 'r') as f:
            template = json.load(f)
        
        os.remove(file_path)
        git_add_commit(file_path, f"Deleted template {template.get('name', id)}")
        
        return jsonify({"message": "Template deleted successfully"})
    except FileNotFoundError:
        return jsonify({"error": "Template not found"}), 404

# API Routes for Calendars
@app.route('/api/calendars', methods=['GET'])
def get_calendars():
    calendars = []
    for filename in os.listdir('data/calendars'):
        if filename.endswith('.json'):
            with open(os.path.join('data/calendars', filename), 'r') as f:
                calendar = json.load(f)
                calendars.append(calendar)
    return jsonify(calendars)

@app.route('/api/calendars/<id>', methods=['GET'])
def get_calendar(id):
    try:
        with open(os.path.join('data/calendars', f'{id}.json'), 'r') as f:
            calendar = json.load(f)
        return jsonify(calendar)
    except FileNotFoundError:
        return jsonify({"error": "Calendar not found"}), 404

@app.route('/api/calendars', methods=['POST'])
def create_calendar():
    data = request.get_json()
    id = datetime.now().strftime('%Y%m%d%H%M%S')
    data['id'] = id
    
    # If based on a template, copy the template structure
    if 'template_id' in data:
        template_path = os.path.join('data/templates', f"{data['template_id']}.json")
        if os.path.exists(template_path):
            with open(template_path, 'r') as f:
                template = json.load(f)
                data['schedule'] = template.get('schedule', {})
    
    with open(os.path.join('data/calendars', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/calendars/{id}.json', f"Added calendar {data.get('name', id)}")
    
    return jsonify(data), 201

@app.route('/api/calendars/<id>', methods=['PUT'])
def update_calendar(id):
    data = request.get_json()
    data['id'] = id
    
    try:
        with open(os.path.join('data/calendars', f'{id}.json'), 'r') as f:
            existing = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Calendar not found"}), 404
    
    with open(os.path.join('data/calendars', f'{id}.json'), 'w') as f:
        json.dump(data, f, indent=2)
    
    git_add_commit(f'data/calendars/{id}.json', f"Updated calendar {data.get('name', id)}")
    
    return jsonify(data)

@app.route('/api/calendars/<id>', methods=['DELETE'])
def delete_calendar(id):
    try:
        file_path = os.path.join('data/calendars', f'{id}.json')
        with open(file_path, 'r') as f:
            calendar = json.load(f)
        
        os.remove(file_path)
        git_add_commit(file_path, f"Deleted calendar {calendar.get('name', id)}")
        
        return jsonify({"message": "Calendar deleted successfully"})
    except FileNotFoundError:
        return jsonify({"error": "Calendar not found"}), 404

# Backup and restore functions
@app.route('/api/backup', methods=['GET'])
def backup_data():
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    backup_dir = f'data/backup_{timestamp}'
    os.makedirs(backup_dir, exist_ok=True)
    
    # Copy all data folders to backup directory
    for folder in ['caregivers', 'categories', 'activities', 'templates', 'calendars']:
        if os.path.exists(os.path.join('data', folder)):
            shutil.copytree(os.path.join('data', folder), os.path.join(backup_dir, folder))
    
    # Copy caregiver images
    if os.path.exists(app.config['UPLOAD_FOLDER']):
        images_backup_dir = os.path.join(backup_dir, 'images', 'caregivers')
        os.makedirs(images_backup_dir, exist_ok=True)
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            shutil.copy2(
                os.path.join(app.config['UPLOAD_FOLDER'], filename),
                os.path.join(images_backup_dir, filename)
            )
    
    # Create a JSON file with metadata about the backup
    metadata = {
        'timestamp': timestamp,
        'created_at': datetime.now().isoformat(),
        'description': request.args.get('description', f'Backup created at {timestamp}')
    }
    
    with open(os.path.join(backup_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    git_add_commit(backup_dir, f"Backup created at {timestamp}")
    
    return jsonify({
        "message": f"Backup created at {timestamp}", 
        "backup_dir": backup_dir,
        "metadata": metadata
    })

@app.route('/api/backups', methods=['GET'])
def list_backups():
    """List all available backups"""
    backups = []
    
    for dirname in os.listdir('data'):
        if dirname.startswith('backup_'):
            metadata_path = os.path.join('data', dirname, 'metadata.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    backups.append({
                        'id': dirname.replace('backup_', ''),
                        'path': dirname,
                        'metadata': metadata
                    })
            else:
                # For backups without metadata
                backups.append({
                    'id': dirname.replace('backup_', ''),
                    'path': dirname,
                    'metadata': {
                        'timestamp': dirname.replace('backup_', ''),
                        'created_at': None,
                        'description': f'Backup {dirname}'
                    }
                })
    
    # Sort by timestamp (newest first)
    backups.sort(key=lambda x: x['id'], reverse=True)
    
    return jsonify(backups)

@app.route('/api/restore/<backup_id>', methods=['POST'])
def restore_backup(backup_id):
    """Restore data from a backup"""
    backup_dir = f'data/backup_{backup_id}'
    
    if not os.path.exists(backup_dir):
        return jsonify({"error": f"Backup {backup_id} not found"}), 404
    
    # Create a backup of current state before restoring
    current_timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    current_backup_dir = f'data/pre_restore_backup_{current_timestamp}'
    
    # Backup current data before restoring
    backup_data()
    
    # Remove current data
    for folder in ['caregivers', 'categories', 'activities', 'templates', 'calendars']:
        folder_path = os.path.join('data', folder)
        if os.path.exists(folder_path):
            for filename in os.listdir(folder_path):
                if filename != '.gitkeep':  # Keep .gitkeep files
                    file_path = os.path.join(folder_path, filename)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
    
    # Copy from backup
    for folder in ['caregivers', 'categories', 'activities', 'templates', 'calendars']:
        backup_folder = os.path.join(backup_dir, folder)
        if os.path.exists(backup_folder):
            for filename in os.listdir(backup_folder):
                src_path = os.path.join(backup_folder, filename)
                dst_path = os.path.join('data', folder, filename)
                if os.path.isfile(src_path):
                    shutil.copy2(src_path, dst_path)
    
    # Restore caregiver images if they exist in the backup
    backup_images_dir = os.path.join(backup_dir, 'images', 'caregivers')
    if os.path.exists(backup_images_dir):
        # Clear current images
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
        
        # Copy images from backup
        for filename in os.listdir(backup_images_dir):
            src_path = os.path.join(backup_images_dir, filename)
            dst_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.isfile(src_path):
                shutil.copy2(src_path, dst_path)
    
    # Commit all changes
    git_add_commit('data', f"Restored from backup {backup_id}")
    
    return jsonify({
        "message": f"Data restored from backup {backup_id}",
        "backup_id": backup_id
    })

# Modified Git status route for production
@app.route('/api/git/status', methods=['GET'])
def git_status():
    """Get the current git status"""
    # Return dummy data in production
    if app.config['ENVIRONMENT'] == 'production':
        return jsonify({
            "branch": "production",
            "changes": [],
            "has_changes": False,
            "is_production": True
        })
    
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            check=True,
            capture_output=True,
            text=True
        )
        
        changes = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        # Get current branch
        branch_result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            check=True,
            capture_output=True,
            text=True
        )
        branch = branch_result.stdout.strip()
        
        return jsonify({
            "branch": branch,
            "changes": changes,
            "has_changes": len(changes) > 0,
            "is_production": False
        })
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Git operation failed: {str(e)}", "details": e.stderr}), 500
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

# Modified Git push route for production
@app.route('/api/git/push', methods=['POST'])
def git_push():
    """Force push all changes to the remote repository"""
    # Return dummy success in production
    if app.config['ENVIRONMENT'] == 'production':
        return jsonify({
            "message": "Git operations are disabled in production environment",
            "details": "This is a simulated success response"
        })
    
    try:
        remote = app.config['GIT_REMOTE']
        branch = app.config['GIT_BRANCH']
        
        # Add all changes
        subprocess.run(["git", "add", "--all"], check=True)
        
        # Check if there are changes to commit
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            check=True,
            capture_output=True,
            text=True
        )
        
        if status_result.stdout.strip():
            # Commit changes
            message = request.json.get('message', f"Automatic commit at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            subprocess.run(["git", "commit", "-m", message], check=True)
        
        # Push to remote
        push_result = subprocess.run(
            ["git", "push", remote, branch],
            check=True,
            capture_output=True,
            text=True
        )
        
        return jsonify({
            "message": f"Successfully pushed to {remote}/{branch}",
            "details": push_result.stdout
        })
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Git operation failed: {str(e)}", "details": e.stderr}), 500
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

# Test endpoint for Git configuration
@app.route('/api/git/test', methods=['GET'])
def test_git_config():
    """Test Git configuration and operations"""
    try:
        # Create a temporary test file
        test_file_path = 'test_git_config.txt'
        with open(test_file_path, 'w') as f:
            f.write(f"Git test from {app.config['ENVIRONMENT']} environment\n")
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Server: {request.host}\n")
            
        # Get Git configuration
        git_config = subprocess.run(
            ["git", "config", "--list"],
            check=True,
            capture_output=True,
            text=True
        ).stdout
        
        # Try to add and commit the file (won't push)
        add_result = subprocess.run(
            ["git", "add", test_file_path],
            check=True,
            capture_output=True,
            text=True
        )
        
        commit_result = subprocess.run(
            ["git", "commit", "-m", f"Test commit from {app.config['ENVIRONMENT']} at {datetime.now().isoformat()}"],
            check=True,
            capture_output=True,
            text=True
        )
        
        # Test auto-push setting but don't actually push
        auto_push = os.environ.get('GIT_AUTO_PUSH', 'false').lower() == 'true'
        
        return jsonify({
            "environment": app.config['ENVIRONMENT'],
            "git_config": git_config.strip().split('\n'),
            "auto_push_enabled": auto_push,
            "test_file": test_file_path,
            "add_result": add_result.stdout.strip(),
            "commit_result": commit_result.stdout.strip(),
            "success": True,
            "message": "Git configuration test completed successfully"
        })
    except subprocess.CalledProcessError as e:
        return jsonify({
            "error": f"Git operation failed: {str(e)}",
            "details": e.stderr,
            "success": False
        }), 500
    except Exception as e:
        return jsonify({
            "error": f"Error: {str(e)}",
            "success": False
        }), 500

# Diagnostic endpoint for Git configuration
@app.route('/api/git/diagnose', methods=['GET'])
def diagnose_git():
    """Run comprehensive Git diagnostic tests"""
    try:
        # Check if the diagnostic script exists
        script_path = 'diagnose_git.py'
        if not os.path.exists(script_path):
            return jsonify({
                "error": "Diagnostic script not found",
                "success": False
            }), 404
            
        # Run the diagnostic script
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            env=os.environ.copy()
        )
        
        # Parse the output to extract meaningful information
        output_lines = result.stdout.split('\n')
        sections = {}
        current_section = "General"
        sections[current_section] = []
        
        for line in output_lines:
            if line.startswith("="*80):
                # New section header follows
                continue
            elif line.startswith(" ") and len(line.strip()) > 0 and line.strip()[0] not in ["=", "$"]:
                # This is a section header
                current_section = line.strip()
                sections[current_section] = []
            else:
                sections[current_section].append(line)
        
        # Extract environment variables
        env_vars = {}
        if "Environment Variables" in sections:
            for line in sections["Environment Variables"]:
                if ": " in line:
                    key, value = line.split(": ", 1)
                    env_vars[key] = value
        
        return jsonify({
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.stderr else None,
            "sections": sections,
            "environment": env_vars,
            "exit_code": result.returncode
        })
    except Exception as e:
        return jsonify({
            "error": f"Error running diagnostic: {str(e)}",
            "success": False
        }), 500

if __name__ == '__main__':
    # Use environment variables for host and port if available
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug) 