package tech.nicorp.pm.repositories.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.git.GitService;
import tech.nicorp.pm.repositories.domain.Repository;
import tech.nicorp.pm.repositories.repo.RepositoryRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.repositories.api.dto.RepositoryResponse;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories")
public class RepositoriesController {

    private final GitService git;
    private final RepositoryRepository repositories;
    private final ProjectRepository projects;

    public RepositoriesController(GitService git, RepositoryRepository repositories, ProjectRepository projects) {
        this.git = git;
        this.repositories = repositories;
        this.projects = projects;
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

    @GetMapping
    public ResponseEntity<Object> list(@RequestParam(name = "project_id", required = false) UUID projectId) {
        if (projectId != null && !projects.existsById(projectId)) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "project_not_found"));
        var list = repositories.findAll().stream()
                .filter(r -> projectId == null || (r.getProject() != null && projectId.equals(r.getProject().getId())))
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        if (name == null || name.isBlank()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_name"));
        Repository r = new Repository();
        r.setName(name);
        if (body.get("default_branch") != null) r.setDefaultBranch((String) body.get("default_branch"));
        if (body.get("project_id") instanceof String s) {
            try { var pid = UUID.fromString(s); projects.findById(pid).ifPresent(r::setProject); } catch (IllegalArgumentException ignored) {}
        }
        Repository saved = repositories.save(r);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    private RepositoryResponse toResponse(Repository r) {
        RepositoryResponse resp = new RepositoryResponse();
        resp.setId(r.getId());
        resp.setName(r.getName());
        resp.setDefaultBranch(r.getDefaultBranch());
        if (r.getProject() != null) resp.setProjectId(r.getProject().getId());
        resp.setCreatedAt(r.getCreatedAt());
        return resp;
    }
}


