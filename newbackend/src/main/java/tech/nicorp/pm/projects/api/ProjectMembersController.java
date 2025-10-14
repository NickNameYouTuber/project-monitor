package tech.nicorp.pm.projects.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.projects.api.dto.*;
import tech.nicorp.pm.projects.domain.ProjectMember;
import tech.nicorp.pm.projects.domain.ProjectRole;
import tech.nicorp.pm.projects.service.ProjectMemberService;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@Tag(name = "Project Members", description = "Управление участниками проектов")
public class ProjectMembersController {

    private final ProjectMemberService projectMemberService;

    public ProjectMembersController(ProjectMemberService projectMemberService) {
        this.projectMemberService = projectMemberService;
    }

    @GetMapping
    @Operation(summary = "Получить список участников проекта")
    public ResponseEntity<List<ProjectMemberResponse>> listMembers(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal Object principal) {
        
        UUID userId = extractUserId(principal);
        if (userId == null || !projectMemberService.hasAccess(projectId, userId)) {
            return ResponseEntity.status(403).build();
        }
        
        List<ProjectMember> members = projectMemberService.getMembers(projectId);
        return ResponseEntity.ok(members.stream().map(this::toResponse).toList());
    }

    @PostMapping
    @Operation(summary = "Добавить участника в проект")
    public ResponseEntity<ProjectMemberResponse> addMember(
            @PathVariable UUID projectId,
            @RequestBody ProjectMemberCreateRequest request,
            @AuthenticationPrincipal Object principal) {
        
        UUID currentUserId = extractUserId(principal);
        if (currentUserId == null) {
            return ResponseEntity.status(401).build();
        }
        
        ProjectRole currentUserRole = projectMemberService.getUserRole(projectId, currentUserId).orElse(null);
        if (currentUserRole == null || !projectMemberService.canManageMembers(currentUserRole)) {
            return ResponseEntity.status(403).build();
        }
        
        UUID newUserId = UUID.fromString(request.getUserId());
        ProjectRole newRole = request.getRole() != null 
                ? ProjectRole.valueOf(request.getRole()) 
                : ProjectRole.DEVELOPER;
        
        ProjectMember member = projectMemberService.addMember(projectId, newUserId, newRole);
        
        return ResponseEntity
                .created(URI.create("/api/projects/" + projectId + "/members/" + member.getId()))
                .body(toResponse(member));
    }

    @DeleteMapping("/{memberId}")
    @Operation(summary = "Удалить участника из проекта")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID projectId,
            @PathVariable UUID memberId,
            @AuthenticationPrincipal Object principal) {
        
        UUID currentUserId = extractUserId(principal);
        if (currentUserId == null) {
            return ResponseEntity.status(401).build();
        }
        
        ProjectRole currentUserRole = projectMemberService.getUserRole(projectId, currentUserId).orElse(null);
        if (currentUserRole == null || !projectMemberService.canManageMembers(currentUserRole)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            projectMemberService.removeMember(memberId);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{memberId}/role")
    @Operation(summary = "Изменить роль участника")
    public ResponseEntity<ProjectMemberResponse> updateRole(
            @PathVariable UUID projectId,
            @PathVariable UUID memberId,
            @RequestBody ProjectMemberUpdateRoleRequest request,
            @AuthenticationPrincipal Object principal) {
        
        UUID currentUserId = extractUserId(principal);
        if (currentUserId == null) {
            return ResponseEntity.status(401).build();
        }
        
        ProjectRole currentUserRole = projectMemberService.getUserRole(projectId, currentUserId).orElse(null);
        if (currentUserRole == null || !projectMemberService.canManageMembers(currentUserRole)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            ProjectRole newRole = ProjectRole.valueOf(request.getRole());
            ProjectMember updatedMember = projectMemberService.updateRole(memberId, newRole);
            return ResponseEntity.ok(toResponse(updatedMember));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).build();
        }
    }

    @GetMapping("/check-access")
    @Operation(summary = "Проверить доступ текущего пользователя к проекту")
    public ResponseEntity<CheckProjectAccessResponse> checkAccess(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal Object principal) {
        
        UUID userId = extractUserId(principal);
        if (userId == null) {
            return ResponseEntity.ok(new CheckProjectAccessResponse(false, null, false, false, false, false, false));
        }
        
        ProjectRole role = projectMemberService.getUserRole(projectId, userId).orElse(null);
        if (role == null) {
            return ResponseEntity.ok(new CheckProjectAccessResponse(false, null, false, false, false, false, false));
        }
        
        CheckProjectAccessResponse response = new CheckProjectAccessResponse(
                true,
                role.name(),
                projectMemberService.canEditProject(role),
                projectMemberService.canDeleteProject(role),
                projectMemberService.canManageMembers(role),
                projectMemberService.canCreateTasks(role),
                projectMemberService.canEditTasks(role)
        );
        
        return ResponseEntity.ok(response);
    }

    private ProjectMemberResponse toResponse(ProjectMember member) {
        ProjectMemberResponse response = new ProjectMemberResponse();
        response.setId(member.getId());
        response.setProjectId(member.getProject().getId());
        response.setUserId(member.getUser().getId());
        response.setRole(member.getRole());
        response.setCreatedAt(member.getCreatedAt());
        
        if (member.getUser() != null) {
            ProjectMemberResponse.UserBasicInfo userInfo = new ProjectMemberResponse.UserBasicInfo();
            userInfo.setId(member.getUser().getId());
            userInfo.setUsername(member.getUser().getUsername());
            userInfo.setDisplayName(member.getUser().getDisplayName());
            response.setUser(userInfo);
        }
        
        return response;
    }

    private UUID extractUserId(Object principal) {
        if (principal == null) return null;
        try {
            if (principal instanceof String s) {
                return UUID.fromString(s);
            }
            return null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

