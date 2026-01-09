package tech.nicorp.pm.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tech.nicorp.pm.projects.api.dto.ProjectResponse;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.ProjectRole;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.repo.TaskColumnRepository;
import tech.nicorp.pm.projects.service.ProjectMemberService;
import tech.nicorp.pm.realtime.RealtimeEventService;
import tech.nicorp.pm.tasks.api.dto.TaskResponse;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;
import tech.nicorp.pm.whiteboards.domain.Whiteboard;
import tech.nicorp.pm.whiteboards.domain.WhiteboardElement;
import tech.nicorp.pm.whiteboards.repo.WhiteboardRepository;
import tech.nicorp.pm.whiteboards.repo.WhiteboardElementRepository;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AIActionExecutor {
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TaskColumnRepository taskColumnRepository;
    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardElementRepository whiteboardElementRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final ProjectMemberService projectMemberService;
    private final RealtimeEventService realtimeEventService;
    private final ObjectMapper objectMapper;

    @Autowired
    public AIActionExecutor(TaskRepository taskRepository,
                           ProjectRepository projectRepository,
                           TaskColumnRepository taskColumnRepository,
                           WhiteboardRepository whiteboardRepository,
                           WhiteboardElementRepository whiteboardElementRepository,
                           OrganizationRepository organizationRepository,
                           UserRepository userRepository,
                           ProjectMemberService projectMemberService,
                           RealtimeEventService realtimeEventService,
                           ObjectMapper objectMapper) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.taskColumnRepository = taskColumnRepository;
        this.whiteboardRepository = whiteboardRepository;
        this.whiteboardElementRepository = whiteboardElementRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.projectMemberService = projectMemberService;
        this.realtimeEventService = realtimeEventService;
        this.objectMapper = objectMapper;
    }

    public List<AIAction> parseActions(String aiResponse) {
        try {
            Map<String, Object> response = objectMapper.readValue(aiResponse, new TypeReference<Map<String, Object>>() {});
            Object actionsObj = response.get("actions");
            if (actionsObj instanceof List) {
                List<Map<String, Object>> actionsList = (List<Map<String, Object>>) actionsObj;
                return actionsList.stream()
                    .map(actionMap -> {
                        AIAction action = new AIAction();
                        action.setType((String) actionMap.get("type"));
                        action.setParams((Map<String, Object>) actionMap.get("params"));
                        return action;
                    })
                    .collect(Collectors.toList());
            }
        } catch (Exception e) {
        }
        return new ArrayList<>();
    }

    public AIAction executeAction(AIAction action, UUID userId, UUID organizationId, UUID projectId) {
        if (action == null || action.getType() == null) {
            return action;
        }

        try {
            switch (action.getType()) {
                case "CREATE_TASK":
                    return executeCreateTask(action, userId, organizationId, projectId);
                case "CREATE_PROJECT":
                    return executeCreateProject(action, userId, organizationId);
                case "CREATE_COLUMN":
                    return executeCreateColumn(action, userId, organizationId, projectId);
                case "CREATE_WHITEBOARD_SECTION":
                    return executeCreateWhiteboardSection(action, userId, projectId);
                case "LINK_TASK_TO_SECTION":
                    return executeLinkTaskToSection(action);
                default:
                    return action;
            }
        } catch (Exception e) {
            action.setResult(Map.of("error", e.getMessage()));
            return action;
        }
    }

    private AIAction executeCreateTask(AIAction action, UUID userId, UUID organizationId, UUID projectId) {
        if (projectId == null) {
            action.setResult(Map.of("error", "Project ID is required"));
            return action;
        }

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            action.setResult(Map.of("error", "Project not found"));
            return action;
        }

        Map<String, Object> params = action.getParams();
        String title = (String) params.get("title");
        String description = (String) params.get("description");
        String columnName = params.get("column_name") != null ? (String) params.get("column_name") : null;
        String columnIdStr = params.get("column_id") != null ? (String) params.get("column_id") : null;

        if (title == null || title.isEmpty()) {
            action.setResult(Map.of("error", "Task title is required"));
            return action;
        }

        UUID columnId = null;
        if (columnIdStr != null) {
            try {
                columnId = UUID.fromString(columnIdStr);
            } catch (IllegalArgumentException e) {
                action.setResult(Map.of("error", "Invalid column_id format"));
                return action;
            }
        } else if (columnName != null && !columnName.isEmpty()) {
            TaskColumn column = taskColumnRepository.findByProject_IdAndNameIgnoreCase(projectId, columnName).orElse(null);
            if (column != null) {
                columnId = column.getId();
            } else {
                action.setResult(Map.of("error", "Task column with name '" + columnName + "' not found in project"));
                return action;
            }
        }

        if (columnId == null) {
            List<TaskColumn> columns = taskColumnRepository.findByProject_IdOrderByOrderIndexAsc(projectId);
            if (columns.isEmpty()) {
                action.setResult(Map.of("error", "No task columns found in project"));
                return action;
            }
            columnId = columns.get(0).getId();
        }

        TaskColumn column = taskColumnRepository.findById(columnId).orElse(null);
        if (column == null) {
            action.setResult(Map.of("error", "Task column not found"));
            return action;
        }

        Task task = new Task();
        task.setProject(project);
        task.setColumn(column);
        task.setTitle(title);
        task.setDescription(description);

        Integer order = params.get("order") instanceof Number ? ((Number) params.get("order")).intValue() : null;
        if (order != null) {
            task.setOrderIndex(order);
        }

        Task saved = taskRepository.save(task);
        action.setResult(Map.of("id", saved.getId().toString(), "title", saved.getTitle()));

        ActionNotification notification = new ActionNotification();
        notification.setMessage("Создал задачу '" + saved.getTitle() + "'");
        notification.setLink("/" + organizationId + "/projects/" + projectId + "/tasks");
        notification.setLinkText("Перейти к задаче");
        action.setNotification(notification);

        return action;
    }

    private AIAction executeCreateProject(AIAction action, UUID userId, UUID organizationId) {
        if (organizationId == null) {
            action.setResult(Map.of("error", "Organization ID is required"));
            return action;
        }

        Map<String, Object> params = action.getParams();
        String name = (String) params.get("name");
        String description = (String) params.get("description");
        String status = params.get("status") != null ? (String) params.get("status") : "backlog";

        if (name == null || name.isEmpty()) {
            action.setResult(Map.of("error", "Project name is required"));
            return action;
        }

        tech.nicorp.pm.organizations.domain.Organization org = organizationRepository.findById(organizationId).orElse(null);
        if (org == null) {
            action.setResult(Map.of("error", "Organization not found"));
            return action;
        }

        tech.nicorp.pm.users.domain.User owner = userRepository.findById(userId).orElse(null);
        if (owner == null) {
            action.setResult(Map.of("error", "User not found"));
            return action;
        }

        String validStatus = status;
        if (!validStatus.equals("backlog") && !validStatus.equals("in-progress") && 
            !validStatus.equals("review") && !validStatus.equals("completed") && 
            !validStatus.equals("inPlans")) {
            validStatus = "backlog";
        }

        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        project.setStatus(validStatus);
        project.setPriority("medium");
        project.setOrganization(org);
        project.setOwner(owner);

        Project saved = projectRepository.save(project);
        
        try {
            projectMemberService.addMember(saved.getId(), userId, ProjectRole.OWNER);
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("already a member")) {
            } else {
                action.setResult(Map.of("id", saved.getId().toString(), "name", saved.getName(), "warning", "Project created but failed to add owner as member: " + e.getMessage()));
                return action;
            }
        } catch (Exception e) {
            action.setResult(Map.of("id", saved.getId().toString(), "name", saved.getName(), "warning", "Project created but failed to add owner as member: " + e.getMessage()));
            return action;
        }
        
        action.setResult(Map.of("id", saved.getId().toString(), "name", saved.getName()));

        try {
            ProjectResponse projectResponse = toProjectResponse(saved);
            log.info("AIActionExecutor: Sending project-created event for project {} in organization {}", saved.getId(), organizationId);
            log.debug("AIActionExecutor: ProjectResponse details - id: {}, name: {}, status: {}", 
                projectResponse.getId(), projectResponse.getName(), projectResponse.getStatus());
            try {
                realtimeEventService.sendProjectCreated(organizationId, projectResponse);
                log.info("AIActionExecutor: Project-created event sent successfully via realtimeEventService");
            } catch (Exception e) {
                log.error("AIActionExecutor: Error sending project-created event via realtimeEventService", e);
                throw e;
            }
        } catch (Exception e) {
            log.error("AIActionExecutor: Error sending project-created event", e);
        }

        ActionNotification notification = new ActionNotification();
        notification.setMessage("Создал проект '" + saved.getName() + "'");
        notification.setLink("/" + organizationId + "/projects/" + saved.getId());
        notification.setLinkText("Перейти к проекту");
        action.setNotification(notification);

        return action;
    }

    private AIAction executeCreateColumn(AIAction action, UUID userId, UUID organizationId, UUID projectId) {
        if (projectId == null) {
            action.setResult(Map.of("error", "Project ID is required"));
            return action;
        }

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            action.setResult(Map.of("error", "Project not found"));
            return action;
        }

        Map<String, Object> params = action.getParams();
        String name = (String) params.get("name");
        
        // Support multiple columns split by comma
        String[] columnNames = name.contains(",") ? name.split(",") : new String[]{name};
        List<String> createdNames = new ArrayList<>();
        
        // Get initial max order
        List<TaskColumn> existingColumns = taskColumnRepository.findByProject_IdOrderByOrderIndexAsc(projectId);
        int currentOrder = existingColumns.stream()
            .mapToInt(TaskColumn::getOrderIndex)
            .max()
            .orElse(-1) + 1;

        for (String colNameRaw : columnNames) {
            String colName = colNameRaw.trim();
            if (colName.isEmpty()) continue;

            // Colors palette
            String[] colors = {"#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e"};
            String colColor = params.get("color") != null ? (String) params.get("color") : null;
            
            if (colColor == null) {
                int hash = Math.abs(colName.hashCode());
                colColor = colors[hash % colors.length];
            }

            TaskColumn column = new TaskColumn();
            column.setProject(project);
            column.setName(colName);
            column.setColor(colColor);
            column.setOrderIndex(currentOrder++);

            TaskColumn saved = taskColumnRepository.save(column);
            createdNames.add(saved.getName());
            
            // Notify realtime
            Map<String, Object> columnData = new HashMap<>();
            columnData.put("id", saved.getId());
            columnData.put("projectId", saved.getProject().getId());
            columnData.put("name", saved.getName());
            columnData.put("orderIndex", saved.getOrderIndex());
            columnData.put("color", saved.getColor());
            realtimeEventService.sendColumnCreated(projectId, columnData);
        }

        String msg;
        if (createdNames.size() == 1) {
            msg = "Создана колонка '" + createdNames.get(0) + "'";
        } else {
            msg = "Создано колонок: " + createdNames.size() + " (" + String.join(", ", createdNames) + ")";
        }
        
        ActionNotification notification = new ActionNotification();
        notification.setMessage(msg);
        notification.setLink("/" + organizationId + "/projects/" + projectId + "/tasks");
        notification.setLinkText("Перейти к задачам");
        action.setNotification(notification);

        return action;
    }

    private AIAction executeCreateWhiteboardSection(AIAction action, UUID userId, UUID projectId) {
        if (projectId == null) {
            action.setResult(Map.of("error", "Project ID is required"));
            return action;
        }

        Whiteboard board = whiteboardRepository.findByProject_Id(projectId).orElse(null);
        if (board == null) {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null) {
                action.setResult(Map.of("error", "Project not found"));
                return action;
            }
            board = new Whiteboard();
            board.setProject(project);
            board = whiteboardRepository.save(board);
        }

        Map<String, Object> params = action.getParams();
        String label = (String) params.get("label");
        Number x = params.get("x") instanceof Number ? (Number) params.get("x") : 100;
        Number y = params.get("y") instanceof Number ? (Number) params.get("y") : 100;
        Number width = params.get("width") instanceof Number ? (Number) params.get("width") : 300;
        Number height = params.get("height") instanceof Number ? (Number) params.get("height") : 200;

        WhiteboardElement element = new WhiteboardElement();
        element.setBoard(board);
        element.setType("section");
        element.setX(x.intValue());
        element.setY(y.intValue());
        element.setWidth(width.intValue());
        element.setHeight(height.intValue());
        element.setText(label != null ? label : "Section");
        element.setFill("rgba(0,0,0,0.05)");
        element.setTextColor("#94a3b8");
        element.setRotation(0);
        element.setZIndex(0);
        element.setFontSize(14);

        WhiteboardElement saved = whiteboardElementRepository.save(element);
        action.setResult(Map.of("id", saved.getId().toString(), "label", label));

        Project project = projectRepository.findById(projectId).orElse(null);
        String orgId = project != null && project.getOrganization() != null ? project.getOrganization().getId().toString() : "";

        ActionNotification notification = new ActionNotification();
        notification.setMessage("Создал секции на вайтборде");
        notification.setLink("/" + orgId + "/projects/" + projectId + "/whiteboard");
        notification.setLinkText("Перейти к вайтборду");
        action.setNotification(notification);

        return action;
    }

    private AIAction executeLinkTaskToSection(AIAction action) {
        Map<String, Object> params = action.getParams();
        String elementIdStr = (String) params.get("element_id");
        String taskIdStr = (String) params.get("task_id");

        if (elementIdStr == null || taskIdStr == null) {
            action.setResult(Map.of("error", "element_id and task_id are required"));
            return action;
        }

        UUID elementId = UUID.fromString(elementIdStr);
        UUID taskId = UUID.fromString(taskIdStr);

        WhiteboardElement element = whiteboardElementRepository.findById(elementId).orElse(null);
        Task task = taskRepository.findById(taskId).orElse(null);

        if (element == null || task == null) {
            action.setResult(Map.of("error", "Element or task not found"));
            return action;
        }

        element.setTask(task);
        whiteboardElementRepository.save(element);

        action.setResult(Map.of("element_id", elementId.toString(), "task_id", taskId.toString()));

        ActionNotification notification = new ActionNotification();
        notification.setMessage("Привязал задачу к секции на вайтборде");
        UUID projectId = task.getProject().getId();
        notification.setLink("/" + (task.getProject().getOrganization() != null ? task.getProject().getOrganization().getId().toString() : "") + "/projects/" + projectId + "/whiteboard?elementId=" + elementId);
        notification.setLinkText("Перейти к вайтборду");
        action.setNotification(notification);

        return action;
    }

    private ProjectResponse toProjectResponse(Project project) {
        ProjectResponse response = new ProjectResponse();
        response.setId(project.getId());
        response.setName(project.getName());
        response.setDescription(project.getDescription());
        response.setStatus(project.getStatus());
        response.setPriority(project.getPriority());
        response.setAssignee(project.getAssignee());
        response.setOrderIndex(project.getOrderIndex());
        response.setColor(project.getColor());
        response.setCreatedAt(project.getCreatedAt());
        if (project.getOwner() != null) {
            response.setOwnerId(project.getOwner().getId());
        }
        if (project.getOrganization() != null) {
            response.setOrganizationId(project.getOrganization().getId());
        }
        return response;
    }

    private TaskResponse toTaskResponse(Task task) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setTitle(task.getTitle());
        response.setDescription(task.getDescription());
        if (task.getColumn() != null) {
            response.setColumnId(task.getColumn().getId());
        }
        if (task.getProject() != null) {
            response.setProjectId(task.getProject().getId());
        }
        response.setOrder(task.getOrderIndex());
        response.setCreatedAt(task.getCreatedAt());
        response.setUpdatedAt(task.getUpdatedAt());
        response.setRepositoryId(task.getRepositoryId());
        response.setRepositoryBranch(task.getRepositoryBranch());
        return response;
    }
}
