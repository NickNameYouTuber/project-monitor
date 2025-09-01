package tech.nicorp.pm.tasks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.comments.domain.Comment;
import tech.nicorp.pm.comments.repo.CommentRepository;
import tech.nicorp.pm.tasks.api.dto.AttachBranchRequest;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.UUID;

@RestController
@RequestMapping("/api/task-repository")
@Tag(name = "Task-Repository", description = "Интеграция задач и репозитория")
public class TaskRepositoryIntegrationController {

    private final CommentRepository comments;
    private final UserRepository users;

    public TaskRepositoryIntegrationController(CommentRepository comments, UserRepository users) {
        this.comments = comments;
        this.users = users;
    }

    @GetMapping("/{taskId}/branches")
    @Operation(summary = "Ветки, связанные с задачей")
    public ResponseEntity<List<Map<String, Object>>> getBranches(@PathVariable UUID taskId) {
        List<Map<String, Object>> result = comments.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .filter(c -> c.isSystem() && (c.getContent().contains("Created branch") || c.getContent().contains("Привязана ветка")))
                .map(c -> {
                    String content = c.getContent();
                    String branchName = extractBranchName(content);
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("branch_name", branchName);
                    m.put("created_at", c.getCreatedAt());
                    return m;
                }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{taskId}/attach-branch")
    @Operation(summary = "Привязать ветку к задаче")
    public ResponseEntity<Map<String, Object>> attach(Authentication auth, @PathVariable UUID taskId, @RequestBody AttachBranchRequest body) {
        if (auth == null || auth.getName() == null) return ResponseEntity.status(401).build();
        User u = users.findById(UUID.fromString(auth.getName())).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();
        Comment c = new Comment();
        c.setTaskId(taskId);
        c.setUser(u);
        c.setSystem(true);
        c.setContent("🔄 Привязана ветка **" + body.getBranch() + "**");
        comments.save(c);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    private String extractBranchName(String content) {
        if (content.contains("**")) {
            String[] parts = content.split("\\*\\*");
            if (parts.length >= 2) return parts[1];
        }
        if (content.startsWith("Created branch ")) {
            int fromIdx = content.indexOf(" from ");
            return fromIdx > 0 ? content.substring("Created branch ".length(), fromIdx) : content.substring("Created branch ".length());
        }
        if (content.startsWith("🔄 Привязана ветка ")) {
            int end = content.indexOf(' ', "🔄 Привязана ветка ".length());
            return end > 0 ? content.substring("🔄 Привязана ветка ".length(), end) : content.substring("🔄 Привязана ветка ".length());
        }
        return content;
    }
}


