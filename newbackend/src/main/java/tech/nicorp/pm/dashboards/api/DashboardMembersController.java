package tech.nicorp.pm.dashboards.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.dashboards.api.dto.DashboardMemberCreateRequest;
import tech.nicorp.pm.dashboards.api.dto.DashboardMemberResponse;
import tech.nicorp.pm.dashboards.domain.Dashboard;
import tech.nicorp.pm.dashboards.domain.DashboardMember;
import tech.nicorp.pm.dashboards.repo.DashboardMemberRepository;
import tech.nicorp.pm.dashboards.repo.DashboardRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/dashboards/{dashboardId}")
@Tag(name = "Dashboard Members", description = "Участники дашборда")
public class DashboardMembersController {

    private final DashboardRepository dashboards;
    private final DashboardMemberRepository members;
    private final UserRepository users;

    public DashboardMembersController(DashboardRepository dashboards, DashboardMemberRepository members, UserRepository users) {
        this.dashboards = dashboards;
        this.members = members;
        this.users = users;
    }

    @GetMapping("/members")
    @Operation(summary = "Список участников дашборда")
    public ResponseEntity<List<DashboardMemberResponse>> list(Authentication auth, @PathVariable UUID dashboardId) {
        Dashboard d = dashboards.findById(dashboardId).orElse(null);
        if (d == null) return ResponseEntity.notFound().build();
        if (!isOwnerOrMember(auth, d)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(members.findAll().stream()
                .filter(m -> m.getDashboard().getId().equals(dashboardId) && m.isActive())
                .map(this::toResponse)
                .toList());
    }

    @PostMapping("/members")
    @Operation(summary = "Добавить участника в дашборд")
    public ResponseEntity<DashboardMemberResponse> add(Authentication auth, @PathVariable UUID dashboardId, @RequestBody DashboardMemberCreateRequest body) {
        Dashboard d = dashboards.findById(dashboardId).orElse(null);
        if (d == null) return ResponseEntity.notFound().build();
        if (!isOwner(auth, d)) return ResponseEntity.status(403).build();

        UUID userId = UUID.fromString(body.getUserId());
        User u = users.findById(userId).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();

        DashboardMember m = new DashboardMember();
        m.setDashboard(d);
        m.setUser(u);
        m.setRole(body.getRole() != null ? body.getRole() : "viewer");
        DashboardMember saved = members.save(m);
        return ResponseEntity.created(URI.create("/api/dashboards/" + dashboardId + "/members/" + saved.getId())).body(toResponse(saved));
    }

    @DeleteMapping("/members/{memberId}")
    @Operation(summary = "Удалить участника из дашборда")
    public ResponseEntity<Void> remove(Authentication auth, @PathVariable UUID dashboardId, @PathVariable UUID memberId) {
        Dashboard d = dashboards.findById(dashboardId).orElse(null);
        if (d == null) return ResponseEntity.notFound().build();
        if (!isOwner(auth, d)) return ResponseEntity.status(403).build();
        var optional = members.findById(memberId);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();
        var m = optional.get();
        m.setActive(false);
        members.save(m);
        return ResponseEntity.noContent().build();
    }

    private boolean isOwner(Authentication auth, Dashboard d) {
        if (auth == null || auth.getName() == null || d.getOwner() == null) return false;
        try { return d.getOwner().getId().equals(UUID.fromString(auth.getName())); } catch (IllegalArgumentException e) { return false; }
    }

    private boolean isOwnerOrMember(Authentication auth, Dashboard d) {
        if (isOwner(auth, d)) return true;
        if (auth == null || auth.getName() == null) return false;
        UUID uid;
        try { uid = UUID.fromString(auth.getName()); } catch (IllegalArgumentException e) { return false; }
        return members.findAll().stream().anyMatch(m -> m.getDashboard().getId().equals(d.getId()) && m.isActive() && m.getUser() != null && uid.equals(m.getUser().getId()));
    }

    private DashboardMemberResponse toResponse(DashboardMember m) {
        DashboardMemberResponse r = new DashboardMemberResponse();
        r.setId(m.getId());
        if (m.getDashboard() != null) r.setDashboardId(m.getDashboard().getId());
        if (m.getUser() != null) r.setUserId(m.getUser().getId());
        r.setRole(m.getRole());
        r.setActive(m.isActive());
        r.setCreatedAt(m.getCreatedAt());
        return r;
    }
}


