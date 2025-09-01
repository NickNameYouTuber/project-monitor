package tech.nicorp.pm.tasks.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}")
public class TasksController {

    @GetMapping("/tasks")
    public ResponseEntity<Object> listTasks(@PathVariable UUID projectId) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("message", "list tasks"));
    }

    @PostMapping("/tasks")
    public ResponseEntity<Object> createTask(@PathVariable UUID projectId, @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("message", "create task"));
    }
}


