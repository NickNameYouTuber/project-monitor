package tech.nicorp.pm.realtime;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tech.nicorp.pm.projects.api.dto.ProjectResponse;
import tech.nicorp.pm.tasks.api.dto.TaskResponse;
import tech.nicorp.pm.whiteboards.api.dto.WhiteboardResponse;
import tech.nicorp.pm.websocket.WebSocketSessionManager;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class RealtimeEventService {
    private final WebSocketSessionManager sessionManager;

    public RealtimeEventService(WebSocketSessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    public void sendProjectCreated(UUID organizationId, ProjectResponse project) {
        log.info("Sending project-created event to organization {} for project {}", organizationId, project.getId());
        sessionManager.sendToOrganization(organizationId, "project-created", project);
    }

    public void sendProjectUpdated(UUID organizationId, ProjectResponse project) {
        log.debug("Sending project-updated event to organization {}", organizationId);
        sessionManager.sendToOrganization(organizationId, "project-updated", project);
    }

    public void sendProjectDeleted(UUID organizationId, UUID projectId) {
        log.debug("Sending project-deleted event to organization {}", organizationId);
        sessionManager.sendToOrganization(organizationId, "project-deleted", Map.of("id", projectId.toString()));
    }

    public void sendTaskCreated(UUID projectId, TaskResponse task) {
        log.debug("Sending task-created event for project {}", projectId);
        sessionManager.sendToProject(projectId, "task-created", task);
    }

    public void sendTaskUpdated(UUID projectId, TaskResponse task) {
        log.debug("Sending task-updated event for project {}", projectId);
        sessionManager.sendToProject(projectId, "task-updated", task);
    }

    public void sendTaskDeleted(UUID projectId, UUID taskId) {
        log.debug("Sending task-deleted event for project {}", projectId);
        sessionManager.sendToProject(projectId, "task-deleted", Map.of("id", taskId.toString(), "projectId", projectId.toString()));
    }

    public void sendWhiteboardUpdated(UUID projectId, WhiteboardResponse whiteboard) {
        log.debug("Sending whiteboard-updated event for project {}", projectId);
        sessionManager.sendToProject(projectId, "whiteboard-updated", whiteboard);
    }

    public void sendColumnCreated(UUID projectId, Map<String, Object> column) {
        log.debug("Sending column-created event for project {}", projectId);
        sessionManager.sendToProject(projectId, "column-created", column);
    }

    public void sendColumnUpdated(UUID projectId, Map<String, Object> column) {
        log.debug("Sending column-updated event for project {}", projectId);
        sessionManager.sendToProject(projectId, "column-updated", column);
    }

    public void sendColumnDeleted(UUID projectId, UUID columnId) {
        log.debug("Sending column-deleted event for project {}", projectId);
        sessionManager.sendToProject(projectId, "column-deleted", Map.of("id", columnId.toString(), "projectId", projectId.toString()));
    }
}

