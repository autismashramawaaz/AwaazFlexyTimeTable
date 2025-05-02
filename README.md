# AwaazFlexyTimeTable

A single page web application for managing caregivers, categories, activities, templates, and calendars with Git-based file storage.

## Features

- **Caregivers Management**: CRUD operations for caregivers including performance score, hourly rates per location, and profile picture
- **Categories Management**: CRUD operations for categories
- **Activities Management**: CRUD operations for activities within categories
- **Templates Management**: Weekly calendar templates with 2-hour blocks, assignable caregivers and activities
- **Calendar Management**: CRUD operations for calendars
- **Git-based Storage**: All data is stored in files that are updated in Git

## Setup and Installation

### Local Development

1. Clone the repository:
```bash
git clone [repository-url]
cd AwaazFlexyTimeTable
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file with your configuration:
```bash
cp .env.example .env
# Edit .env file with your settings
```

5. Start the application:
```bash
python app.py
```

6. Open your browser and navigate to:
```
http://localhost:5000
```

### Deployment to Render.com

1. Sign up for a Render account at [render.com](https://render.com)

2. From your Render dashboard, click "New" and select "Web Service"

3. Connect your GitHub repository or use the public repository URL

4. Configure your web service:
   - **Name**: AwaazFlexyTimeTable (or your preferred name)
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   
5. Set environment variables:
   - `SECRET_KEY`: Generate a secure random key
   - `FLASK_ENV`: Set to `production`
   - `GIT_AUTO_PUSH`: Set to `false` (Git operations are disabled in production)
   
6. Click "Create Web Service"

7. Your application will be deployed to a URL like `https://awaazflexytimetable.onrender.com`

## Project Structure

- `app.py`: Main application file
- `models/`: Data models
- `routes/`: API routes
- `static/`: Static files (CSS, JavaScript, images)
- `templates/`: HTML templates
- `data/`: Storage directory for file-based data
- `render.yaml`: Configuration for Render.com deployment 