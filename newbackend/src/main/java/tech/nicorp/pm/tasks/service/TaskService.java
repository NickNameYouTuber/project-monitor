package tech.nicorp.pm.tasks.service;

import org.springframework.stereotype.Service;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.repo.TaskColumnRepository;
import tech.nicorp.pm.tasks.api.dto.TaskCreateFromChatRequest;
import tech.nicorp.pm.tasks.api.dto.TaskResponse;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TaskColumnRepository columnRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, 
                      ProjectRepository projectRepository,
                      TaskColumnRepository columnRepository,
                      UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.columnRepository = columnRepository;
        this.userRepository = userRepository;
    }

    public TaskResponse createTaskFromChat(TaskCreateFromChatRequest request) {
        // Валидация: нужен хотя бы projectId или parentTaskId
        if (request.getProjectId() == null && request.getParentTaskId() == null) {
            throw new IllegalArgumentException("Either projectId or parentTaskId must be provided");
        }

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDeadline());

        // Определяем проект
        Project project = null;
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        } else if (request.getParentTaskId() != null) {
            Task parentTask = taskRepository.findById(request.getParentTaskId())
                    .orElseThrow(() -> new IllegalArgumentException("Parent task not found"));
            project = parentTask.getProject();
        }

        task.setProject(project);

        // Находим первую колонку проекта (обычно "To Do" или "Backlog")
        TaskColumn firstColumn = columnRepository.findByProject_IdOrderByOrderIndexAsc(project.getId())
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No columns found for project"));
        task.setColumn(firstColumn);

        // Устанавливаем порядок (в конец колонки)
        Integer maxOrder = taskRepository.findByColumn_IdOrderByOrderIndexAsc(firstColumn.getId())
                .stream()
                .map(Task::getOrderIndex)
                .max(Integer::compareTo)
                .orElse(-1);
        task.setOrderIndex(maxOrder + 1);

        // Ищем исполнителя по username
        if (request.getAssigneeUsername() != null && !request.getAssigneeUsername().isEmpty()) {
            User assignee = userRepository.findByUsername(request.getAssigneeUsername()).orElse(null);
            if (assignee != null) {
                task.getAssignees().add(assignee);
            }
        }

        // Ищем наблюдателя по username
        if (request.getWatcherUsername() != null && !request.getWatcherUsername().isEmpty()) {
            User watcher = userRepository.findByUsername(request.getWatcherUsername()).orElse(null);
            if (watcher != null) {
                task.setReviewer(watcher);
            }
        }

        Task saved = taskRepository.save(task);
        return toResponse(saved);
    }

    private TaskResponse toResponse(Task t) {
        TaskResponse r = new TaskResponse();
        r.setId(t.getId());
        r.setTitle(t.getTitle());
        r.setDescription(t.getDescription());
        if (t.getColumn() != null) r.setColumnId(t.getColumn().getId());
        if (t.getProject() != null) r.setProjectId(t.getProject().getId());
        r.setOrder(t.getOrderIndex());
        if (t.getReviewer() != null) r.setReviewerId(t.getReviewer().getId());
        r.setDueDate(t.getDueDate());
        r.setEstimateMinutes(t.getEstimateMinutes());
        r.setCreatedAt(t.getCreatedAt());
        r.setUpdatedAt(t.getUpdatedAt());
        return r;
    }
}
