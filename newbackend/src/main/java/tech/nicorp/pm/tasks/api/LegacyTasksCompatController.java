package tech.nicorp.pm.tasks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@Tag(name = "Tasks (compat)", description = "Совместимость со старым API")
public class LegacyTasksCompatController {

    private final TaskRepository tasks;

    public LegacyTasksCompatController(TaskRepository tasks) {
        this.tasks = tasks;
    }

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Список задач проекта (legacy)")
    public ResponseEntity<List<Task>> listTasks(@PathVariable("projectId") UUID projectId) {
        return ResponseEntity.ok(tasks.findByProject_IdOrderByOrderIndexAsc(projectId));
    }
}


