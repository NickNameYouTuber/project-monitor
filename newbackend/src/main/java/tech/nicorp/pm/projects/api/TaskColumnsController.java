package tech.nicorp.pm.projects.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.projects.api.dto.TaskColumnCreateRequest;
import tech.nicorp.pm.projects.api.dto.TaskColumnResponse;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.repo.TaskColumnRepository;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/task-columns")
@Tag(name = "Task Columns", description = "Колонки задач проекта")
public class TaskColumnsController {

    private final TaskColumnRepository columns;
    private final ProjectRepository projects;

    public TaskColumnsController(TaskColumnRepository columns, ProjectRepository projects) {
        this.columns = columns;
        this.projects = projects;
    }

    @GetMapping
    @Operation(summary = "Список колонок")
    public ResponseEntity<List<TaskColumnResponse>> list(@PathVariable("projectId") UUID projectId) {
        Project p = projects.findById(projectId).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(columns.findAll().stream()
                .filter(c -> c.getProject().getId().equals(projectId))
                .map(this::toResponse).toList());
    }

    @PostMapping
    @Operation(summary = "Создать колонку")
    public ResponseEntity<TaskColumnResponse> create(@PathVariable("projectId") UUID projectId, @RequestBody TaskColumnCreateRequest body) {
        Project p = projects.findById(projectId).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        TaskColumn c = new TaskColumn();
        c.setProject(p);
        c.setName(body.getName());
        if (body.getOrderIndex() != null) c.setOrderIndex(body.getOrderIndex());
        TaskColumn saved = columns.save(c);
        return ResponseEntity.created(URI.create("/api/projects/" + projectId + "/task-columns/" + saved.getId())).body(toResponse(saved));
    }

    @DeleteMapping("/{columnId}")
    @Operation(summary = "Удалить колонку")
    public ResponseEntity<Void> delete(@PathVariable("projectId") UUID projectId, @PathVariable("columnId") UUID columnId) {
        if (!columns.existsById(columnId)) return ResponseEntity.notFound().build();
        columns.deleteById(columnId);
        return ResponseEntity.noContent().build();
    }

    private TaskColumnResponse toResponse(TaskColumn c) {
        TaskColumnResponse r = new TaskColumnResponse();
        r.setId(c.getId());
        r.setName(c.getName());
        r.setOrderIndex(c.getOrderIndex());
        return r;
    }
}


