import os
from flask import Flask, render_template, request, redirect, url_for, jsonify, make_response
from werkzeug.utils import secure_filename
import json
from datetime import datetime, timedelta, time
import shutil
import subprocess
from urllib.parse import quote

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'images', 'caregivers')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['GIT_AUTO_PUSH'] = True  # Enable/disable automatic Git push
app.config['GIT_REMOTE'] = 'origin'  # Git remote name
app.config['GIT_BRANCH'] = 'master'  # Git branch to push to

# Ensure data directories exist
os.makedirs('data/caregivers', exist_ok=True)
os.makedirs('data/categories', exist_ok=True)
os.makedirs('data/activities', exist_ok=True)
os.makedirs('data/templates', exist_ok=True)
os.makedirs('data/calendars', exist_ok=True)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Git utility functions
def git_add_commit(file_path, message):
    """Add and commit a file to git, then push if configured"""
    try:
        # Use subprocess instead of os.system for better control
        subprocess.run(["git", "add", file_path], check=True)
        subprocess.run(["git", "commit", "-m", message], check=True)
        
        # Push changes if auto push is enabled
        if app.config['GIT_AUTO_PUSH']:
            remote = app.config['GIT_REMOTE']
            branch = app.config['GIT_BRANCH']
            subprocess.run(["git", "push", remote, branch], check=True)
            print(f"Successfully pushed changes to {remote}/{branch}")
            
    except subprocess.CalledProcessError as e:
        print(f"Git operation failed: {e}")
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

# Calendar Export and View APIs
@app.route('/api/calendars/<id>/export/ics', methods=['GET'])
def export_calendar_ics(id):
    """Export calendar to ICS format"""
    try:
        with open(os.path.join('data/calendars', f'{id}.json'), 'r') as f:
            calendar = json.load(f)
        
        # Create ics content
        ics_content = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//AwaazFlexyTimeTable//Calendar Export//EN",
            f"X-WR-CALNAME:{calendar.get('name', 'Calendar')}",
        ]
        
        # Get the schedule
        schedule = calendar.get('schedule', {})
        start_date = datetime.strptime(calendar.get('start_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d')
        
        day_map = {
            'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 
            'Friday': 4, 'Saturday': 5, 'Sunday': 6
        }
        
        # Add events for each scheduled block
        for day, time_slots in schedule.items():
            day_offset = day_map.get(day, 0)
            event_date = start_date + timedelta(days=day_offset)
            
            for time_slot, block_data in time_slots.items():
                if not block_data:
                    continue
                
                # Skip if no caregivers or activities
                if (not block_data.get('caregiver_ids', []) and not block_data.get('caregiver_id')) or \
                   (not block_data.get('activity_ids', []) and not block_data.get('activity_id')):
                    continue
                
                # Parse time slot (e.g., "8-10" to start at 8:00 and end at 10:00)
                start_hour, end_hour = map(int, time_slot.split('-'))
                event_start = datetime.combine(event_date.date(), time(start_hour, 0, 0))
                event_end = datetime.combine(event_date.date(), time(end_hour, 0, 0))
                
                # Format datetime for ics
                dt_format = "%Y%m%dT%H%M%SZ"
                
                # Get caregiver names
                caregiver_ids = block_data.get('caregiver_ids', [])
                if block_data.get('caregiver_id') and block_data.get('caregiver_id') not in caregiver_ids:
                    caregiver_ids.append(block_data.get('caregiver_id'))
                
                caregiver_names = []
                for cg_id in caregiver_ids:
                    try:
                        with open(os.path.join('data/caregivers', f'{cg_id}.json'), 'r') as f:
                            caregiver = json.load(f)
                            caregiver_names.append(caregiver.get('name', 'Unknown'))
                    except:
                        caregiver_names.append('Unknown')
                
                # Get activity names
                activity_ids = block_data.get('activity_ids', [])
                if block_data.get('activity_id') and block_data.get('activity_id') not in activity_ids:
                    activity_ids.append(block_data.get('activity_id'))
                
                activity_names = []
                for act_id in activity_ids:
                    try:
                        with open(os.path.join('data/activities', f'{act_id}.json'), 'r') as f:
                            activity = json.load(f)
                            activity_names.append(activity.get('name', 'Unknown'))
                    except:
                        activity_names.append('Unknown')
                
                # Create event
                event = [
                    "BEGIN:VEVENT",
                    f"UID:{calendar['id']}_{day}_{time_slot}@awaazflexytimetable",
                    f"DTSTAMP:{datetime.now().strftime(dt_format)}",
                    f"DTSTART:{event_start.strftime(dt_format)}",
                    f"DTEND:{event_end.strftime(dt_format)}",
                    f"SUMMARY:{', '.join(activity_names)}",
                    f"DESCRIPTION:Caregivers: {', '.join(caregiver_names)}\\n" +
                    (f"Notes: {block_data.get('notes', '')}" if block_data.get('notes') else ""),
                    "END:VEVENT"
                ]
                
                ics_content.extend(event)
        
        # Close the calendar
        ics_content.append("END:VCALENDAR")
        
        # Create a response with the ICS content
        response = make_response("\n".join(ics_content))
        response.headers["Content-Disposition"] = f"attachment; filename={calendar.get('name', 'calendar')}.ics"
        response.headers["Content-Type"] = "text/calendar"
        return response
    
    except FileNotFoundError:
        return jsonify({"error": "Calendar not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/calendars/<id>/export/google', methods=['GET'])
def export_calendar_google(id):
    """Get Google Calendar export link"""
    try:
        with open(os.path.join('data/calendars', f'{id}.json'), 'r') as f:
            calendar = json.load(f)
        
        # Generate a URL that can be used to add events to Google Calendar
        base_url = request.host_url.rstrip('/')
        ics_url = f"{base_url}/api/calendars/{id}/export/ics"
        
        # Google Calendar URL to import from URL
        google_calendar_url = f"https://calendar.google.com/calendar/r/settings/addbyurl?url={quote(ics_url)}"
        
        return jsonify({
            "google_calendar_url": google_calendar_url,
            "ics_url": ics_url
        })
    
    except FileNotFoundError:
        return jsonify({"error": "Calendar not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/calendars/<id>/view/<view_type>', methods=['GET'])
def get_calendar_view(id, view_type):
    """Get calendar data in different view formats"""
    try:
        with open(os.path.join('data/calendars', f'{id}.json'), 'r') as f:
            calendar = json.load(f)
        
        # Get all caregivers and activities for reference
        caregivers = []
        for filename in os.listdir('data/caregivers'):
            if filename.endswith('.json'):
                with open(os.path.join('data/caregivers', filename), 'r') as f:
                    caregiver = json.load(f)
                    caregivers.append(caregiver)
        
        activities = []
        for filename in os.listdir('data/activities'):
            if filename.endswith('.json'):
                with open(os.path.join('data/activities', filename), 'r') as f:
                    activity = json.load(f)
                    activities.append(activity)
        
        # Process schedule based on view type
        schedule = calendar.get('schedule', {})
        start_date = datetime.strptime(calendar.get('start_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d')
        
        if view_type == 'hourly':
            # Return the default template schedule format (already grouped by day and time)
            return jsonify({
                "calendar": calendar,
                "view_data": schedule,
                "view_type": "hourly",
                "start_date": calendar.get('start_date')
            })
        
        elif view_type == 'caregiver':
            # Group by caregiver
            caregiver_view = {}
            
            for day, time_slots in schedule.items():
                for time_slot, block_data in time_slots.items():
                    # Check both caregiver_ids (new) and caregiver_id (old format)
                    caregiver_ids = block_data.get('caregiver_ids', [])
                    if block_data.get('caregiver_id') and block_data.get('caregiver_id') not in caregiver_ids:
                        caregiver_ids.append(block_data.get('caregiver_id'))
                    
                    for cg_id in caregiver_ids:
                        if cg_id not in caregiver_view:
                            # Find caregiver info
                            caregiver_info = next((cg for cg in caregivers if cg['id'] == cg_id), {"id": cg_id, "name": "Unknown"})
                            caregiver_view[cg_id] = {
                                "caregiver": caregiver_info,
                                "schedule": {}
                            }
                        
                        if day not in caregiver_view[cg_id]["schedule"]:
                            caregiver_view[cg_id]["schedule"][day] = {}
                        
                        # Copy the block data
                        caregiver_view[cg_id]["schedule"][day][time_slot] = block_data
            
            return jsonify({
                "calendar": calendar,
                "view_data": caregiver_view,
                "view_type": "caregiver",
                "start_date": calendar.get('start_date')
            })
        
        elif view_type == 'grant':
            # Gantt chart style - one row per activity
            gantt_view = {}
            
            for day, time_slots in schedule.items():
                for time_slot, block_data in time_slots.items():
                    # Check both activity_ids (new) and activity_id (old format)
                    activity_ids = block_data.get('activity_ids', [])
                    if block_data.get('activity_id') and block_data.get('activity_id') not in activity_ids:
                        activity_ids.append(block_data.get('activity_id'))
                    
                    for act_id in activity_ids:
                        if act_id not in gantt_view:
                            # Find activity info
                            activity_info = next((act for act in activities if act['id'] == act_id), {"id": act_id, "name": "Unknown"})
                            gantt_view[act_id] = {
                                "activity": activity_info,
                                "schedule": {}
                            }
                        
                        if day not in gantt_view[act_id]["schedule"]:
                            gantt_view[act_id]["schedule"][day] = {}
                        
                        # Copy the block data
                        gantt_view[act_id]["schedule"][day][time_slot] = block_data
            
            return jsonify({
                "calendar": calendar,
                "view_data": gantt_view,
                "view_type": "grant",
                "start_date": calendar.get('start_date')
            })
        
        else:
            return jsonify({"error": f"Invalid view type: {view_type}"}), 400
        
    except FileNotFoundError:
        return jsonify({"error": "Calendar not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/git/status', methods=['GET'])
def git_status():
    """Get the current git status"""
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
            "has_changes": len(changes) > 0
        })
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Git operation failed: {str(e)}", "details": e.stderr}), 500
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

@app.route('/api/git/push', methods=['POST'])
def git_push():
    """Force push all changes to the remote repository"""
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

if __name__ == '__main__':
    app.run(debug=True) 