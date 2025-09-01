package tech.nicorp.pm.dashboards.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.dashboards.domain.Dashboard;
import tech.nicorp.pm.dashboards.repo.DashboardRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.dashboards.api.dto.DashboardCreateRequest;
import org.springframework.security.core.Authentication;
import tech.nicorp.pm.users.repo.UserRepository;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import tech.nicorp.pm.dashboards.api.dto.DashboardResponse;

@RestController
@RequestMapping("/api/dashboards")
@Tag(name = "Dashboards", description = "Управление дашбордами")
public class DashboardsController {

    private final DashboardRepository dashboards;
    private final UserRepository users;

    public DashboardsController(DashboardRepository dashboards, UserRepository users) {
        this.dashboards = dashboards;
        this.users = users;
    }

    @GetMapping
    @Operation(summary = "Список дашбордов")
    public ResponseEntity<List<DashboardResponse>> list() {
        return ResponseEntity.ok(dashboards.findAll().stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Получить дашборд")
    public ResponseEntity<DashboardResponse> get(@PathVariable UUID id) {
        return dashboards.findById(id).map(d -> ResponseEntity.ok(toResponse(d))).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Создать дашборд")
    public ResponseEntity<DashboardResponse> create(Authentication auth, @RequestBody DashboardCreateRequest body) {
        Dashboard d = new Dashboard();
        d.setName(body.getName());
        d.setDescription(body.getDescription());
        if (auth != null && auth.getName() != null) {
            try {
                java.util.UUID uid = java.util.UUID.fromString(auth.getName());
                users.findById(uid).ifPresent(d::setOwner);
            } catch (IllegalArgumentException ignored) {}
        }
        Dashboard saved = dashboards.save(d);
        return ResponseEntity.created(URI.create("/api/dashboards/" + saved.getId())).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Обновить дашборд")
    public ResponseEntity<DashboardResponse> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return dashboards.findById(id).map(d -> {
            if (body.containsKey("name")) d.setName((String) body.get("name"));
            if (body.containsKey("description")) d.setDescription((String) body.get("description"));
            Dashboard saved = dashboards.save(d);
            return ResponseEntity.ok(toResponse(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!dashboards.existsById(id)) return ResponseEntity.notFound().build();
        dashboards.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private DashboardResponse toResponse(Dashboard d) {
        DashboardResponse r = new DashboardResponse();
        r.setId(d.getId());
        r.setName(d.getName());
        r.setDescription(d.getDescription());
        r.setCreatedAt(d.getCreatedAt());
        if (d.getOwner() != null) r.setOwnerId(d.getOwner().getId());
        return r;
    }
}



