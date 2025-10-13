package tech.nicorp.pm.repositories.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.git.GitService;
import tech.nicorp.pm.users.domain.User;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories/{repoId}/files")
@Tag(name = "Repository Files", description = "Редактирование файлов репозитория")
public class RepositoryFilesController {

    private final GitService git;

    public RepositoryFilesController(GitService git) {
        this.git = git;
    }

    @PutMapping
    @Operation(summary = "Создать или изменить файл")
    public ResponseEntity<Object> updateFile(
            @PathVariable UUID repoId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Object principal) {
        String branch = body.get("branch");
        String path = body.get("path");
        String content = body.get("content");
        String message = body.get("message");
        
        if (branch == null || branch.isBlank()) branch = "main";
        if (path == null || path.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_path"));
        }
        if (content == null) content = "";
        if (message == null || message.isBlank()) message = "Update " + path;
        
        String author = "user";
        if (principal instanceof User) {
            author = ((User) principal).getUsername();
        }
        
        try {
            git.commitFile(repoId, branch, path, content, message, author);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "commit_failed", "message", e.getMessage()));
        }
    }

    @DeleteMapping
    @Operation(summary = "Удалить файл")
    public ResponseEntity<Object> deleteFile(
            @PathVariable UUID repoId,
            @RequestParam String branch,
            @RequestParam String path,
            @RequestParam(required = false) String message,
            @AuthenticationPrincipal Object principal) {
        if (branch == null || branch.isBlank()) branch = "main";
        if (path == null || path.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_path"));
        }
        if (message == null || message.isBlank()) message = "Delete " + path;
        
        String author = "user";
        if (principal instanceof User) {
            author = ((User) principal).getUsername();
        }
        
        try {
            git.deleteFile(repoId, branch, path, message, author);
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "delete_failed", "message", e.getMessage()));
        }
    }
}

