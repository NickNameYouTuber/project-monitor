package tech.nicorp.pm.repositories.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.git.GitService;
import tech.nicorp.pm.repositories.domain.Repository;
import tech.nicorp.pm.repositories.domain.RepositoryMember;
import tech.nicorp.pm.repositories.repo.RepositoryRepository;
import tech.nicorp.pm.repositories.repo.RepositoryMemberRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.repositories.api.dto.RepositoryResponse;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories")
public class RepositoriesController {

    private final GitService git;
    private final RepositoryRepository repositories;
    private final ProjectRepository projects;
    private final RepositoryMemberRepository members;
    private final UserRepository users;

    public RepositoriesController(GitService git, RepositoryRepository repositories, ProjectRepository projects, RepositoryMemberRepository members, UserRepository users) {
        this.git = git;
        this.repositories = repositories;
        this.projects = projects;
        this.members = members;
        this.users = users;
    }

    @GetMapping("/{repoId}/refs/branches")
    public ResponseEntity<Object> branches(@PathVariable("repoId") UUID repoId) throws IOException {
        return ResponseEntity.ok(git.branches(repoId));
    }

    @GetMapping("/{repoId}/refs/tags")
    public ResponseEntity<Object> tags(@PathVariable("repoId") UUID repoId) throws IOException {
        return ResponseEntity.ok(git.tags(repoId));
    }

    @GetMapping("/{repoId}/refs/default")
    public ResponseEntity<Object> defaultBranch(@PathVariable("repoId") UUID repoId) throws IOException {
        return ResponseEntity.ok(Map.of("default", git.defaultBranch(repoId)));
    }

    @GetMapping
    public ResponseEntity<Object> list(@RequestParam(name = "project_id", required = false) UUID projectId, @AuthenticationPrincipal Object principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "unauthorized"));
        
        if (projectId != null && !projects.existsById(projectId)) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "project_not_found"));
        
        var list = repositories.findByMemberUserId(userId).stream()
                .filter(r -> projectId == null || (r.getProject() != null && projectId.equals(r.getProject().getId())))
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody Map<String, Object> body, @AuthenticationPrincipal Object principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "unauthorized"));
        
        String name = (String) body.get("name");
        if (name == null || name.isBlank()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_name"));
        Repository r = new Repository();
        r.setName(name);
        if (body.get("default_branch") != null) r.setDefaultBranch((String) body.get("default_branch"));
        if (body.get("description") != null) r.setDescription((String) body.get("description"));
        if (body.get("visibility") != null) r.setVisibility((String) body.get("visibility"));
        if (body.get("project_id") instanceof String s) {
            try { var pid = UUID.fromString(s); projects.findById(pid).ifPresent(r::setProject); } catch (IllegalArgumentException ignored) {}
        }
        Repository saved = repositories.save(r);
        
        User creator = users.findById(userId).orElse(null);
        if (creator != null) {
            RepositoryMember member = new RepositoryMember();
            member.setRepository(saved);
            member.setUser(creator);
            member.setRole("owner");
            members.save(member);
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        Repository r = repositories.findById(id).orElse(null);
        if (r == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "repository_not_found"));
        if (body.get("name") != null) r.setName((String) body.get("name"));
        if (body.get("default_branch") != null) r.setDefaultBranch((String) body.get("default_branch"));
        if (body.get("description") != null) r.setDescription((String) body.get("description"));
        if (body.get("visibility") != null) r.setVisibility((String) body.get("visibility"));
        Repository saved = repositories.save(r);
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable("id") UUID id) {
        if (!repositories.existsById(id)) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "repository_not_found"));
        repositories.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/clone")
    public ResponseEntity<Object> cloneRepository(@RequestBody Map<String, Object> body, @AuthenticationPrincipal Object principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "unauthorized"));
        
        String url = (String) body.get("url");
        String name = (String) body.get("name");
        if (url == null || url.isBlank()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_url"));
        if (name == null || name.isBlank()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_name"));
        
        Repository r = new Repository();
        r.setName(name);
        r.setCloneUrl(url);
        if (body.get("default_branch") != null) r.setDefaultBranch((String) body.get("default_branch"));
        if (body.get("description") != null) r.setDescription((String) body.get("description"));
        if (body.get("visibility") != null) r.setVisibility((String) body.get("visibility"));
        if (body.get("project_id") instanceof String s) {
            try { var pid = UUID.fromString(s); projects.findById(pid).ifPresent(r::setProject); } catch (IllegalArgumentException ignored) {}
        }
        Repository saved = repositories.save(r);
        
        User creator = users.findById(userId).orElse(null);
        if (creator != null) {
            RepositoryMember member = new RepositoryMember();
            member.setRepository(saved);
            member.setUser(creator);
            member.setRole("owner");
            members.save(member);
        }
        
        String authToken = (String) body.get("auth_token");
        try {
            git.cloneRepository(url, saved.getId(), authToken);
        } catch (IOException e) {
            repositories.deleteById(saved.getId());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "clone_failed", "message", e.getMessage()));
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    private UUID extractUserId(Object principal) {
        if (principal == null) return null;
        if (principal instanceof User) return ((User) principal).getId();
        if (principal instanceof String) {
            try { return UUID.fromString((String) principal); }
            catch (IllegalArgumentException e) { return null; }
        }
        return null;
    }

    private RepositoryResponse toResponse(Repository r) {
        RepositoryResponse resp = new RepositoryResponse();
        resp.setId(r.getId());
        resp.setName(r.getName());
        resp.setDefaultBranch(r.getDefaultBranch());
        resp.setCloneUrl(r.getCloneUrl());
        resp.setVisibility(r.getVisibility());
        resp.setDescription(r.getDescription());
        if (r.getProject() != null) resp.setProjectId(r.getProject().getId());
        resp.setCreatedAt(r.getCreatedAt());
        return resp;
    }
}


