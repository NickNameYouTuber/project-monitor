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
@RequestMapping("/api/task-columns")
@Tag(name = "Task Columns (compat)", description = "Совместимость со старым API")
public class LegacyTaskColumnsCompatController {

    private final TaskColumnRepository columns;
    private final ProjectRepository projects;

    public LegacyTaskColumnsCompatController(TaskColumnRepository columns, ProjectRepository projects) {
        this.columns = columns;
        this.projects = projects;
    }

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Список колонок проекта (legacy)")
    public ResponseEntity<List<TaskColumnResponse>> listByProject(@PathVariable("projectId") UUID projectId) {
        Project p = projects.findById(projectId).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(columns.findAll().stream()
                .filter(c -> c.getProject().getId().equals(projectId))
                .map(this::toResponse).toList());
    }

    @GetMapping("/{columnId}")
    @Operation(summary = "Получить колонку (legacy)")
    public ResponseEntity<TaskColumnResponse> get(@PathVariable("columnId") UUID columnId) {
        return columns.findById(columnId).map(c -> ResponseEntity.ok(toResponse(c))).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(path = {"", "/"})
    @Operation(summary = "Создать колонку (legacy)")
    public ResponseEntity<TaskColumnResponse> create(@RequestBody TaskColumnCreateRequest body) {
        if (body.getProjectId() == null) return ResponseEntity.badRequest().build();
        Project p = projects.findById(body.getProjectId()).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        TaskColumn c = new TaskColumn();
        c.setProject(p);
        c.setName(body.getName());
        if (body.getOrderIndex() != null) c.setOrderIndex(body.getOrderIndex());
        TaskColumn saved = columns.save(c);
        return ResponseEntity.created(URI.create("/api/task-columns/" + saved.getId())).body(toResponse(saved));
    }

    @PutMapping("/{columnId}")
    @Operation(summary = "Обновить колонку (legacy)")
    public ResponseEntity<TaskColumnResponse> update(@PathVariable("columnId") UUID columnId, @RequestBody java.util.Map<String, Object> body) {
        return columns.findById(columnId).map(c -> {
            if (body.get("name") != null) c.setName((String) body.get("name"));
            if (body.get("order") instanceof Number n) c.setOrderIndex(n.intValue());
            return ResponseEntity.ok(toResponse(columns.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{columnId}")
    @Operation(summary = "Удалить колонку (legacy)")
    public ResponseEntity<Void> delete(@PathVariable("columnId") UUID columnId) {
        if (!columns.existsById(columnId)) return ResponseEntity.notFound().build();
        columns.deleteById(columnId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder/{projectId}")
    @Operation(summary = "Переупорядочить колонки проекта (legacy)")
    public ResponseEntity<List<TaskColumnResponse>> reorder(@PathVariable("projectId") UUID projectId, @RequestBody List<UUID> columnIds) {
        Project p = projects.findById(projectId).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        var byId = columns.findAll().stream()
                .filter(c -> c.getProject() != null && projectId.equals(c.getProject().getId()))
                .collect(java.util.stream.Collectors.toMap(TaskColumn::getId, c -> c));
        int index = 0;
        for (UUID id : columnIds) {
            TaskColumn c = byId.get(id);
            if (c != null) {
                c.setOrderIndex(index++);
                columns.save(c);
            }
        }
        List<TaskColumnResponse> result = columns.findAll().stream()
                .filter(c -> c.getProject() != null && projectId.equals(c.getProject().getId()))
                .sorted(java.util.Comparator.comparing(c -> c.getOrderIndex() == null ? 0 : c.getOrderIndex()))
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PutMapping("/reorder")
    @Operation(summary = "Переупорядочить колонки проекта (legacy, без projectId)")
    public ResponseEntity<List<TaskColumnResponse>> reorderBody(@RequestBody java.util.Map<String, List<UUID>> body) {
        List<UUID> ids = body.get("column_ids");
        if (ids == null || ids.isEmpty()) return ResponseEntity.badRequest().build();
        UUID projectId = null;
        for (UUID id : ids) {
            var opt = columns.findById(id);
            if (opt.isPresent() && opt.get().getProject() != null) { projectId = opt.get().getProject().getId(); break; }
        }
        if (projectId == null) return ResponseEntity.badRequest().build();
        return reorder(projectId, ids);
    }

    private TaskColumnResponse toResponse(TaskColumn c) {
        TaskColumnResponse r = new TaskColumnResponse();
        r.setId(c.getId());
        r.setName(c.getName());
        r.setOrderIndex(c.getOrderIndex());
        return r;
    }
}


