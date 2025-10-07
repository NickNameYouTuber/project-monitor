package tech.nicorp.pm.tasks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.tasks.api.dto.TaskCreateFromChatRequest;
import tech.nicorp.pm.tasks.api.dto.TaskResponse;
import tech.nicorp.pm.tasks.service.TaskService;

import java.net.URI;

@RestController
@RequestMapping("/api/tasks")
public class ChatTasksController {

    private final TaskService taskService;

    public ChatTasksController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping("/from-chat")
    public ResponseEntity<TaskResponse> createTaskFromChat(@RequestBody TaskCreateFromChatRequest request) {
        try {
            TaskResponse response = taskService.createTaskFromChat(request);
            return ResponseEntity.created(URI.create("/api/tasks/" + response.getId())).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
