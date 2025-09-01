package tech.nicorp.pm.repositories.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.git.GitService;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories")
public class RepositoriesController {

    private final GitService git;

    public RepositoriesController(GitService git) {
        this.git = git;
    }

    @GetMapping("/{repoId}/refs/branches")
    public ResponseEntity<Object> branches(@PathVariable UUID repoId) throws IOException {
        return ResponseEntity.ok(git.branches(repoId));
    }

    @GetMapping("/{repoId}/refs/tags")
    public ResponseEntity<Object> tags(@PathVariable UUID repoId) throws IOException {
        return ResponseEntity.ok(git.tags(repoId));
    }

    @GetMapping("/{repoId}/refs/default")
    public ResponseEntity<Object> defaultBranch(@PathVariable UUID repoId) throws IOException {
        return ResponseEntity.ok(Map.of("default", git.defaultBranch(repoId)));
    }
}


