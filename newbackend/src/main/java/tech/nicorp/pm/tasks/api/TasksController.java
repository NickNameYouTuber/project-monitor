package tech.nicorp.pm.tasks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.repo.OrganizationMemberRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.repo.TaskColumnRepository;
import tech.nicorp.pm.repositories.domain.Repository;
import tech.nicorp.pm.repositories.repo.RepositoryRepository;
import tech.nicorp.pm.security.OrganizationVerificationHelper;
import tech.nicorp.pm.tasks.api.dto.TaskCreateRequest;
import tech.nicorp.pm.tasks.api.dto.TaskRepositoryInfo;
import tech.nicorp.pm.tasks.api.dto.TaskResponse;
import tech.nicorp.pm.tasks.api.dto.TaskAssigneeInfo;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}")
public class TasksController {

    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final TaskColumnRepository columns;
    private final RepositoryRepository repositories;
    private final UserRepository users;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationVerificationHelper verificationHelper;

    public TasksController(TaskRepository tasks, ProjectRepository projects, TaskColumnRepository columns, 
                          RepositoryRepository repositories, UserRepository users,
                          OrganizationMemberRepository organizationMemberRepository,
                          OrganizationVerificationHelper verificationHelper) {
        this.tasks = tasks;
        this.projects = projects;
        this.columns = columns;
        this.repositories = repositories;
        this.users = users;
        this.organizationMemberRepository = organizationMemberRepository;
        this.verificationHelper = verificationHelper;
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<TaskResponse>> listTasks(@PathVariable("projectId") UUID projectId, Authentication auth) {
        if (!checkAccess(projectId, auth)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(tasks.findByProject_IdOrderByOrderIndexAsc(projectId).stream().map(this::toResponse).toList());
    }

    @PostMapping("/tasks")
    public ResponseEntity<TaskResponse> createTask(@PathVariable("projectId") UUID projectId, @RequestBody TaskCreateRequest body, Authentication auth) {
        if (!checkAccess(projectId, auth)) {
            return ResponseEntity.status(403).build();
        }
        Project p = projects.findById(projectId).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        TaskColumn col = columns.findById(body.getColumnId()).orElse(null);
        if (col == null) return ResponseEntity.notFound().build();
        Task t = new Task();
        t.setProject(p);
        t.setColumn(col);
        t.setTitle(body.getTitle());
        t.setDescription(body.getDescription());
        if (body.getOrder() != null) t.setOrderIndex(body.getOrder());
        if (body.getRepositoryId() != null) t.setRepositoryId(body.getRepositoryId());
        if (body.getRepositoryBranch() != null) t.setRepositoryBranch(body.getRepositoryBranch());
        Task saved = tasks.save(t);
        return ResponseEntity.created(URI.create("/api/projects/" + projectId + "/tasks/" + saved.getId())).body(toResponse(saved));
    }

    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponse> update(@PathVariable("projectId") UUID projectId,
                                               @PathVariable("taskId") UUID taskId,
                                               @RequestBody java.util.Map<String, Object> body,
                                               Authentication auth) {
        if (!checkAccess(projectId, auth)) {
            return ResponseEntity.status(403).build();
        }
        return tasks.findById(taskId).map(t -> {
            if (body.get("title") != null) t.setTitle((String) body.get("title"));
            if (body.get("description") != null) t.setDescription((String) body.get("description"));
            Object orderVal = body.get("order");
            if (orderVal instanceof Number n) t.setOrderIndex(n.intValue());
            if (body.get("column_id") instanceof String s) {
                try { UUID cid = UUID.fromString(s); columns.findById(cid).ifPresent(t::setColumn); } catch (IllegalArgumentException ignored) {}
            }
            return ResponseEntity.ok(toResponse(tasks.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/tasks/{taskId}/move")
    public ResponseEntity<TaskResponse> move(@PathVariable("projectId") UUID projectId,
                                             @PathVariable("taskId") UUID taskId,
                                             @RequestBody java.util.Map<String, Object> body,
                                             Authentication auth) {
        if (!checkAccess(projectId, auth)) {
            return ResponseEntity.status(403).build();
        }
        return tasks.findById(taskId).map(t -> {
            if (body.get("column_id") instanceof String s) {
                try { UUID cid = UUID.fromString(s); columns.findById(cid).ifPresent(t::setColumn); } catch (IllegalArgumentException ignored) {}
            }
            Object orderVal = body.get("order");
            if (orderVal instanceof Number n) t.setOrderIndex(n.intValue());
            return ResponseEntity.ok(toResponse(tasks.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> delete(@PathVariable("projectId") UUID projectId,
                                       @PathVariable("taskId") UUID taskId,
                                       Authentication auth) {
        if (!checkAccess(projectId, auth)) {
            return ResponseEntity.status(403).build();
        }
        if (!tasks.existsById(taskId)) return ResponseEntity.notFound().build();
        tasks.deleteById(taskId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/tasks/column/{columnId}/reorder")
    public ResponseEntity<List<TaskResponse>> reorderColumn(@PathVariable("projectId") UUID projectId,
                                                            @PathVariable("columnId") UUID columnId,
                                                            @RequestBody java.util.Map<String, java.util.List<UUID>> body,
                                                            Authentication auth) {
        if (!checkAccess(projectId, auth)) {
            return ResponseEntity.status(403).build();
        }
        var ids = body.get("task_ids");
        if (ids == null) return ResponseEntity.badRequest().build();
        var byId = new java.util.HashMap<UUID, Task>();
        tasks.findByColumn_IdOrderByOrderIndexAsc(columnId).forEach(t -> byId.put(t.getId(), t));
        int index = 0;
        for (UUID id : ids) {
            Task t = byId.get(id);
            if (t != null) {
                t.setOrderIndex(index++);
                tasks.save(t);
            }
        }
        List<TaskResponse> result = tasks.findByColumn_IdOrderByOrderIndexAsc(columnId).stream().map(this::toResponse).toList();
        return ResponseEntity.ok(result);
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
        r.setRepositoryId(t.getRepositoryId());
        r.setRepositoryBranch(t.getRepositoryBranch());
        
        if (t.getRepositoryId() != null) {
            Repository repo = repositories.findById(t.getRepositoryId()).orElse(null);
            if (repo != null) {
                TaskRepositoryInfo info = new TaskRepositoryInfo();
                info.setRepositoryId(t.getRepositoryId());
                info.setRepositoryName(repo.getName());
                info.setBranch(t.getRepositoryBranch());
                r.setRepositoryInfo(info);
            }
        }
        
        if (t.getAssignee() != null) {
            r.setAssigneeId(t.getAssignee().getId());
            
            TaskAssigneeInfo assigneeInfo = new TaskAssigneeInfo();
            assigneeInfo.setId(t.getAssignee().getId());
            assigneeInfo.setUsername(t.getAssignee().getUsername());
            assigneeInfo.setDisplayName(t.getAssignee().getDisplayName());
            r.setAssignee(assigneeInfo);
        }
        
        return r;
    }
    
    private boolean checkAccess(UUID projectId, Authentication auth) {
        if (auth == null || auth.getName() == null) return false;
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            Project project = projects.findById(projectId).orElse(null);
            
            if (project == null || project.getOrganization() == null) return false;
            
            UUID organizationId = project.getOrganization().getId();
            
            // Проверка 1: Членство в организации
            if (!organizationMemberRepository.findByOrganizationIdAndUserId(organizationId, userId).isPresent()) {
                return false;
            }
            
            // Проверка 2: Верификация (пароль/SSO)
            return verificationHelper.isVerified(organizationId, auth);
        } catch (Exception e) {
            return false;
        }
    }
}


