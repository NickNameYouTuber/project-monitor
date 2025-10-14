package tech.nicorp.pm.projects.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.api.dto.ProjectCreateRequest;
import tech.nicorp.pm.projects.api.dto.ProjectUpdateRequest;
import tech.nicorp.pm.projects.api.dto.ProjectResponse;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import tech.nicorp.pm.users.repo.UserRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.dashboards.repo.DashboardRepository;
import tech.nicorp.pm.dashboards.domain.Dashboard;
import tech.nicorp.pm.projects.api.dto.ProjectsReorderRequest;
import tech.nicorp.pm.projects.service.ProjectMemberService;
import tech.nicorp.pm.projects.domain.ProjectRole;

@RestController
@RequestMapping("/api/projects")
@Tag(name = "Projects", description = "Управление проектами")
public class ProjectsController {

    private final ProjectRepository projects;
    private final UserRepository users;
    private final DashboardRepository dashboards;
    private final ProjectMemberService projectMemberService;

    public ProjectsController(ProjectRepository projects, UserRepository users, DashboardRepository dashboards, ProjectMemberService projectMemberService) {
        this.projects = projects;
        this.users = users;
        this.dashboards = dashboards;
        this.projectMemberService = projectMemberService;
    }

    @GetMapping
    @Operation(summary = "Список проектов")
    public ResponseEntity<List<ProjectResponse>> list() {
        return ResponseEntity.ok(projects.findAll().stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Получить проект по идентификатору")
    public ResponseEntity<ProjectResponse> get(@PathVariable("id") UUID id) {
        return projects.findById(id).map(p -> ResponseEntity.ok(toResponse(p))).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Создать проект")
    public ResponseEntity<ProjectResponse> create(Authentication auth, @RequestBody ProjectCreateRequest body) {
        Project p = new Project();
        p.setName(body.getName());
        p.setDescription(body.getDescription());
        p.setStatus(body.getStatus() != null ? body.getStatus() : "inPlans");
        p.setPriority(body.getPriority() != null ? body.getPriority() : "medium");
        p.setAssignee(body.getAssignee());
        if (body.getOrderIndex() != null) p.setOrderIndex(body.getOrderIndex());
        if (body.getColor() != null) p.setColor(body.getColor());
        
        UUID ownerId = null;
        if (auth != null && auth.getName() != null) {
            try {
                ownerId = UUID.fromString(auth.getName());
                users.findById(ownerId).ifPresent(p::setOwner);
            } catch (IllegalArgumentException ignored) {}
        }
        
        if (body.getDashboardId() != null) {
            try {
                UUID did = UUID.fromString(body.getDashboardId());
                dashboards.findById(did).ifPresent(p::setDashboard);
            } catch (IllegalArgumentException ignored) {}
        }
        
        Project saved = projects.save(p);
        
        if (ownerId != null) {
            try {
                projectMemberService.addMember(saved.getId(), ownerId, ProjectRole.OWNER);
            } catch (Exception e) {
            }
        }
        
        return ResponseEntity.created(URI.create("/api/projects/" + saved.getId())).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Обновить проект")
    public ResponseEntity<ProjectResponse> update(@PathVariable("id") UUID id, @RequestBody ProjectUpdateRequest body) {
        return projects.findById(id).map(p -> {
            if (body.getName() != null) p.setName(body.getName());
            if (body.getDescription() != null) p.setDescription(body.getDescription());
            if (body.getStatus() != null) p.setStatus(body.getStatus());
            if (body.getPriority() != null) p.setPriority(body.getPriority());
            if (body.getAssignee() != null) p.setAssignee(body.getAssignee());
            if (body.getOrderIndex() != null) p.setOrderIndex(body.getOrderIndex());
            if (body.getColor() != null) p.setColor(body.getColor());
            Project saved = projects.save(p);
            return ResponseEntity.ok(toResponse(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить проект")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        if (!projects.existsById(id)) return ResponseEntity.notFound().build();
        projects.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Обновить статус проекта")
    public ResponseEntity<ProjectResponse> updateStatus(@PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        return projects.findById(id).map(p -> {
            p.setStatus(status);
            Project saved = projects.save(p);
            return ResponseEntity.ok(toResponse(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    private ProjectResponse toResponse(Project p) {
        ProjectResponse r = new ProjectResponse();
        r.setId(p.getId());
        r.setName(p.getName());
        r.setDescription(p.getDescription());
        r.setStatus(p.getStatus());
        r.setPriority(p.getPriority());
        r.setAssignee(p.getAssignee());
        r.setOrderIndex(p.getOrderIndex());
        r.setColor(p.getColor());
        r.setCreatedAt(p.getCreatedAt());
        if (p.getOwner() != null) r.setOwnerId(p.getOwner().getId());
        if (p.getDashboard() != null) r.setDashboardId(p.getDashboard().getId());
        return r;
    }

    @PostMapping("/reorder")
    @Operation(summary = "Изменить порядок проектов")
    public ResponseEntity<Map<String, Object>> reorder(@RequestBody ProjectsReorderRequest req) {
        if (req.getProjectId() == null || req.getTargetProjectId() == null || req.getPosition() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_request"));
        }
        try {
            UUID draggedId = UUID.fromString(req.getProjectId());
            UUID targetId = UUID.fromString(req.getTargetProjectId());
            Project dragged = projects.findById(draggedId).orElse(null);
            Project target = projects.findById(targetId).orElse(null);
            if (dragged == null || target == null) return ResponseEntity.notFound().build();
            int targetIndex = target.getOrderIndex() != null ? target.getOrderIndex() : 0;
            int insertIndex = req.getPosition().equals("above") ? targetIndex : targetIndex + 1;
            dragged.setOrderIndex(insertIndex);
            projects.save(dragged);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_uuid"));
        }
    }
}



