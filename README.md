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

4. Start the application:
```bash
python app.py
```

5. Open your browser and navigate to:
```
http://localhost:5000
```

## Project Structure

- `app.py`: Main application file
- `models/`: Data models
- `routes/`: API routes
- `static/`: Static files (CSS, JavaScript, images)
- `templates/`: HTML templates
- `data/`: Storage directory for file-based data 