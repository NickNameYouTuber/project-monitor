package tech.nicorp.pm.tasks.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@Tag(name = "Tasks (compat)", description = "Совместимость со старым API")
public class LegacyTasksCompatController {

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Список задач проекта (legacy)")
    public ResponseEntity<Object> listTasks(@PathVariable("projectId") UUID projectId) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("message", "list tasks (compat)", "projectId", projectId));
    }
}


