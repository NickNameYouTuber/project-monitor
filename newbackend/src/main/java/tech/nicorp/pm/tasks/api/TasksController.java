package tech.nicorp.pm.tasks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.repo.TaskColumnRepository;
import tech.nicorp.pm.tasks.api.dto.TaskCreateRequest;
import tech.nicorp.pm.tasks.api.dto.TaskResponse;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}")
public class TasksController {

    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final TaskColumnRepository columns;

    public TasksController(TaskRepository tasks, ProjectRepository projects, TaskColumnRepository columns) {
        this.tasks = tasks;
        this.projects = projects;
        this.columns = columns;
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<TaskResponse>> listTasks(@PathVariable("projectId") UUID projectId) {
        return ResponseEntity.ok(tasks.findByProject_IdOrderByOrderIndexAsc(projectId).stream().map(this::toResponse).toList());
    }

    @PostMapping("/tasks")
    public ResponseEntity<TaskResponse> createTask(@PathVariable("projectId") UUID projectId, @RequestBody TaskCreateRequest body) {
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
        t.setRepositoryId(body.getRepositoryId());
        t.setRepositoryBranch(body.getRepositoryBranch());
        Task saved = tasks.save(t);
        return ResponseEntity.created(URI.create("/api/projects/" + projectId + "/tasks/" + saved.getId())).body(toResponse(saved));
    }

    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponse> update(@PathVariable("projectId") UUID projectId,
                                               @PathVariable("taskId") UUID taskId,
                                               @RequestBody java.util.Map<String, Object> body) {
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
                                             @RequestBody java.util.Map<String, Object> body) {
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
                                       @PathVariable("taskId") UUID taskId) {
        if (!tasks.existsById(taskId)) return ResponseEntity.notFound().build();
        tasks.deleteById(taskId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/tasks/column/{columnId}/reorder")
    public ResponseEntity<List<TaskResponse>> reorderColumn(@PathVariable("projectId") UUID projectId,
                                                            @PathVariable("columnId") UUID columnId,
                                                            @RequestBody java.util.Map<String, java.util.List<UUID>> body) {
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
        return r;
    }
}


