import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
import json
from datetime import datetime
import shutil

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'images', 'caregivers')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Ensure data directories exist
os.makedirs('data/caregivers', exist_ok=True)
os.makedirs('data/categories', exist_ok=True)
os.makedirs('data/activities', exist_ok=True)
os.makedirs('data/templates', exist_ok=True)
os.makedirs('data/calendars', exist_ok=True)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Git utility functions
def git_add_commit(file_path, message):
    """Add and commit a file to git"""
    os.system(f"git add {file_path}")
    os.system(f'git commit -m "{message}"')

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
    
    git_add_commit(backup_dir, f"Backup created at {timestamp}")
    
    return jsonify({"message": f"Backup created at {timestamp}", "backup_dir": backup_dir})

if __name__ == '__main__':
    app.run(debug=True) 