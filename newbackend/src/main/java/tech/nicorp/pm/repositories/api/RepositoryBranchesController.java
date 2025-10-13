package tech.nicorp.pm.repositories.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.git.GitService;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories/{repoId}/branches")
@Tag(name = "Repository Branches", description = "Управление ветками репозитория")
public class RepositoryBranchesController {

    private final GitService git;

    public RepositoryBranchesController(GitService git) {
        this.git = git;
    }

    @PostMapping
    @Operation(summary = "Создать новую ветку")
    public ResponseEntity<Object> createBranch(
            @PathVariable UUID repoId,
            @RequestBody Map<String, String> body) {
        String branchName = body.get("name");
        String fromRef = body.get("from_ref");
        
        if (branchName == null || branchName.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_branch_name"));
        }
        if (fromRef == null || fromRef.isBlank()) {
            fromRef = "HEAD";
        }
        
        try {
            git.createBranch(repoId, branchName, fromRef);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("name", branchName));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "create_failed", "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{branchName}")
    @Operation(summary = "Удалить ветку")
    public ResponseEntity<Object> deleteBranch(
            @PathVariable UUID repoId,
            @PathVariable String branchName) {
        try {
            git.deleteBranch(repoId, branchName);
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "delete_failed", "message", e.getMessage()));
        }
    }
}

