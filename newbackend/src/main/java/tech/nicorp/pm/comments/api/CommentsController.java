package tech.nicorp.pm.comments.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.comments.api.dto.CommentCreateRequest;
import tech.nicorp.pm.comments.api.dto.CommentResponse;
import tech.nicorp.pm.comments.domain.Comment;
import tech.nicorp.pm.comments.repo.CommentRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Comments", description = "Комментарии к задачам")
public class CommentsController {

    private final CommentRepository comments;
    private final UserRepository users;

    public CommentsController(CommentRepository comments, UserRepository users) {
        this.comments = comments;
        this.users = users;
    }

    @GetMapping("/tasks/{taskId}/comments")
    @Operation(summary = "Список комментариев к задаче")
    public ResponseEntity<List<CommentResponse>> list(@PathVariable("taskId") UUID taskId) {
        return ResponseEntity.ok(comments.findByTaskIdOrderByCreatedAtAsc(taskId).stream().map(this::toResponse).toList());
    }

    @PostMapping("/comments")
    @Operation(summary = "Создать комментарий")
    public ResponseEntity<CommentResponse> create(Authentication auth, @RequestBody CommentCreateRequest body) {
        if (auth == null || auth.getName() == null) return ResponseEntity.status(401).build();
        User u = users.findById(UUID.fromString(auth.getName())).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();
        Comment c = new Comment();
        c.setContent(body.getContent());
        c.setTaskId(body.getTaskId());
        c.setUser(u);
        Comment saved = comments.save(c);
        return ResponseEntity.created(URI.create("/api/comments/" + saved.getId())).body(toResponse(saved));
    }

    private CommentResponse toResponse(Comment c) {
        CommentResponse r = new CommentResponse();
        r.setId(c.getId());
        r.setContent(c.getContent());
        r.setTaskId(c.getTaskId());
        if (c.getUser() != null) {
            r.setUserId(c.getUser().getId());
            r.setUsername(c.getUser().getUsername());
        }
        r.setSystem(c.isSystem());
        r.setCreatedAt(c.getCreatedAt());
        r.setUpdatedAt(c.getUpdatedAt());
        return r;
    }
}


