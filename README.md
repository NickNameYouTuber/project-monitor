# Project Monitor

A full-stack application for monitoring projects and tasks across teams with a drag-and-drop interface. This application consists of a React TypeScript frontend and a Python FastAPI backend.

## Project Structure

```
project-monitor/
│
├── frontend/            # React TypeScript Vite frontend
│   ├── src/             # Frontend source code
│   ├── Dockerfile       # Frontend Docker configuration
│   └── nginx.conf       # Nginx configuration for serving the frontend
│
├── backend/             # Python FastAPI backend
│   ├── app/             # Backend application code
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   ├── schemas/     # Pydantic schemas for API
│   │   └── main.py      # FastAPI application entry point
│   └── Dockerfile       # Backend Docker configuration
│
└── docker-compose.yml   # Docker compose configuration to run both services
```

## Features

- **User Authentication**: Register and login with JWT tokens
- **Project Management**: Create, update, delete projects
- **Drag and Drop**: Move projects between status columns
- **Dashboard Organization**: Group projects by dashboard
- **Team Management**: Add and remove team members
- **Dark/Light Theme**: Toggle between dark and light modes

## Running the Application

### Development Mode

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Docker Mode

Use Docker Compose to run both services:

```bash
docker-compose up --build
```

- Frontend will be available at: http://localhost:7670
- Backend API will be available at: http://localhost:7671
- API documentation will be available at: http://localhost:7671/docs

## API Endpoints

- **Authentication**:
  - POST `/api/auth/register` - Register a new user
  - POST `/api/auth/token` - Login and get access token

- **Users**:
  - GET `/api/users/me` - Get current user info
  - PUT `/api/users/me` - Update current user

- **Projects**:
  - GET `/api/projects` - List all user's projects
  - POST `/api/projects` - Create a new project
  - GET `/api/projects/{id}` - Get project by ID
  - PUT `/api/projects/{id}` - Update project
  - DELETE `/api/projects/{id}` - Delete project

- **Dashboards**:
  - GET `/api/dashboards` - List all user's dashboards
  - POST `/api/dashboards` - Create a new dashboard
  - GET `/api/dashboards/{id}` - Get dashboard by ID with projects
  - PUT `/api/dashboards/{id}` - Update dashboard
  - DELETE `/api/dashboards/{id}` - Delete dashboard
