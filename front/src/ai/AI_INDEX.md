# AI Assistant Capabilities Index

This index defines the capabilities and action schemas for the AI Assistant. It serves as a "Search Index" for the model to understand what actions it can perform and the required JSON structure for each.

## 1. Project Management
### `project.create`
Create a new project.
```json
{
  "type": "project.create",
  "params": {
    "organizationId": "string (UUID)",
    "title": "string",
    "description": "string (optional)",
    "status": "string (columnId, optional)",
    "color": "string (hex, optional)"
  },
  "notification": {
    "message": "Project created successfully",
    "link": "/{orgId}/projects/{projectId}/tasks",
    "linkText": "Open Project"
  }
}
```

### `project.update`
Update a project's details.
```json
{
  "type": "project.update",
  "params": {
    "projectId": "string (UUID)",
    "title": "string (optional)",
    "description": "string (optional)",
    "color": "string (hex, optional)"
  }
}
```

### `project.move`
Move a project to a different status column.
```json
{
  "type": "project.move",
  "params": {
    "projectId": "string (UUID)",
    "columnId": "string (UUID)"
  }
}
```

## 2. Project Columns (Kanban)
### `project_column.create`
Create a status column for projects.
```json
{
  "type": "project_column.create",
  "params": {
    "organizationId": "string (UUID)",
    "title": "string",
    "color": "string (hex, optional)",
    "order": "number (optional)"
  }
}
```

### `project_column.update`
Update a project column.
```json
{
  "type": "project_column.update",
  "params": {
    "columnId": "string (UUID)",
    "title": "string (optional)",
    "color": "string (hex, optional)"
  }
}
```

### `project_column.delete`
Delete a project column.
```json
{
  "type": "project_column.delete",
  "params": {
    "columnId": "string (UUID)"
  }
}
```

### `project_column.reorder`
Reorder project columns.
```json
{
  "type": "project_column.reorder",
  "params": {
    "organizationId": "string (UUID)",
    "columnIds": ["string (UUID)", "..."]
  }
}
```

## 3. Task Management
### `task.create`
Create a new task.
```json
{
  "type": "task.create",
  "params": {
    "projectId": "string (UUID)",
    "title": "string",
    "description": "string (optional)",
    "priority": "low" | "medium" | "high",
    "status": "string (columnId)",
    "assignee": "string (username, optional)",
    "dueDate": "string (ISO date, optional)",
    "repository_id": "string (optional)",
    "repositoryBranch": "string (optional)"
  },
  "notification": {
    "message": "Task created",
    "link": "/{orgId}/projects/{projectId}/tasks?highlightTask={taskId}",
    "linkText": "View Task"
  }
}
```

### `task.update`
Update a task.
```json
{
  "type": "task.update",
  "params": {
    "taskId": "string (UUID)",
    "projectId": "string (UUID)",
    "title": "string (optional)",
    "description": "string (optional)",
    "priority": "low" | "medium" | "high" (optional),
    "status": "string (columnId, optional)",
    "assignee": "string (optional)",
    "dueDate": "string (ISO date, optional)"
  }
}
```

### `task.move`
Move a task to a different column (status).
```json
{
  "type": "task.move",
  "params": {
    "taskId": "string (UUID)",
    "projectId": "string (UUID)",
    "columnId": "string (UUID)"
  }
}
```

### `task.delete`
Delete a task.
```json
{
  "type": "task.delete",
  "params": {
    "taskId": "string (UUID)",
    "projectId": "string (UUID)"
  }
}
```

## 4. Task Columns (Kanban)
### `task_column.create`
Create a task status column.
```json
{
  "type": "task_column.create",
  "params": {
    "projectId": "string (UUID)",
    "title": "string",
    "color": "string (hex, optional)",
    "order": "number (optional)"
  }
}
```

### `task_column.update`
Update a task column.
```json
{
  "type": "task_column.update",
  "params": {
    "columnId": "string (UUID)",
    "projectId": "string (UUID)",
    "title": "string (optional)",
    "color": "string (hex, optional)"
  }
}
```

### `task_column.delete`
Delete a task column.
```json
{
  "type": "task_column.delete",
  "params": {
    "columnId": "string (UUID)",
    "projectId": "string (UUID)"
  }
}
```

### `task_column.reorder`
Reorder task columns.
```json
{
  "type": "task_column.reorder",
  "params": {
    "projectId": "string (UUID)",
    "columnIds": ["string (UUID)", "..."]
  }
}
```

## 5. Whiteboard Operations
### `whiteboard.create_sticky`
```json
{
  "type": "whiteboard.create_sticky",
  "params": {
    "projectId": "string (UUID)",
    "text": "string",
    "color": "string (hex, optional)",
    "x": "number (optional)",
    "y": "number (optional)"
  }
}
```

### `whiteboard.create_section`
```json
{
  "type": "whiteboard.create_section",
  "params": {
    "projectId": "string (UUID)",
    "title": "string",
    "x": "number (optional)",
    "y": "number (optional)"
  }
}
```

## 6. Git & Repositories
### `git.repo.create`
Create a new internal repository.
```json
{
  "type": "git.repo.create",
  "params": {
    "name": "string",
    "description": "string (optional)",
    "projectId": "string (UUID)",
    "visibility": "private" | "public"
  }
}
```

### `git.repo.clone`
Mirror an external repository.
```json
{
  "type": "git.repo.clone",
  "params": {
    "url": "string (git url)",
    "name": "string",
    "projectId": "string (UUID)",
    "authToken": "string (optional)"
  }
}
```

### `git.branch.create`
Create a new branch.
```json
{
  "type": "git.branch.create",
  "params": {
    "repoId": "string (UUID)",
    "name": "string",
    "fromRef": "string (optional, default HEAD)"
  }
}
```

### `git.mr.create`
Create a Merge Request.
```json
{
  "type": "git.mr.create",
  "params": {
    "repoId": "string (UUID)",
    "title": "string",
    "sourceBranch": "string",
    "targetBranch": "string",
    "description": "string (optional)"
  }
}
```

### `git.mr.merge`
Merge a Merge Request.
```json
{
  "type": "git.mr.merge",
  "params": {
    "repoId": "string (UUID)",
    "mrId": "string (UUID)"
  }
}
```

## 7. Calls & Meetings
### `call.create`
Schedule or start a new call.
```json
{
  "type": "call.create",
  "params": {
    "title": "string",
    "description": "string (optional)",
    "projectId": "string (UUID, optional)",
    "startAt": "string (ISO date, optional)",
    "participants": ["string (userId)", "..."]
  },
  "notification": {
    "message": "Call started: {title}",
    "link": "/call/{roomId}",
    "linkText": "Join Call"
  }
}
```

## 8. Navigation & UI
### `navigation.goto`
Navigate to a specific route.
```json
{
  "type": "navigation.goto",
  "params": {
    "path": "string"
  }
}
```

### `ui.show_toast`
Show a toast notification.
```json
{
  "type": "ui.show_toast",
  "params": {
    "title": "string",
    "message": "string",
    "variant": "default" | "destructive" | "success"
  }
}
```
