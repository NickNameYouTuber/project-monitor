package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.api.dto.OrganizationMemberResponse;
import tech.nicorp.pm.organizations.domain.OrganizationMember;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations/{orgId}/members")
@Tag(name = "Organization Members", description = "Управление участниками организаций")
public class OrganizationMembersController {

    private final OrganizationMemberService memberService;
    private final tech.nicorp.pm.organizations.repo.OrgRoleRepository roleRepository;

    public OrganizationMembersController(OrganizationMemberService memberService,
                                         tech.nicorp.pm.organizations.repo.OrgRoleRepository roleRepository) {
        this.memberService = memberService;
        this.roleRepository = roleRepository;
    }

    @GetMapping
    @Transactional
    @Operation(summary = "Список участников организации")
    public ResponseEntity<List<OrganizationMemberResponse>> list(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null || !memberService.hasAccess(orgId, userId)) {
            return ResponseEntity.status(403).build();
        }
        
        List<OrganizationMember> members = memberService.getMembers(orgId);
        return ResponseEntity.ok(members.stream().map(this::toResponse).toList());
    }

    @GetMapping("/current")
    @Transactional
    @Operation(summary = "Получить текущего участника организации")
    public ResponseEntity<OrganizationMemberResponse> getCurrentMember(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        return memberService.getMember(orgId, userId)
                .map(this::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(403).build());
    }

    @PostMapping
    @Operation(summary = "Добавить участника в организацию")
    public ResponseEntity<OrganizationMemberResponse> add(
            @PathVariable UUID orgId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        
        UUID currentUserId = extractUserId(auth);
        if (currentUserId == null) {
            return ResponseEntity.status(401).build();
        }
        
        tech.nicorp.pm.organizations.domain.OrgRole currentRole = memberService.getUserOrgRole(orgId, currentUserId).orElse(null);
        if (currentRole == null || !memberService.canManageMembers(currentRole)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            UUID newUserId = UUID.fromString(body.get("user_id"));
            String roleName = body.getOrDefault("role", "Member"); // Default to "Member" if not provided
            
            OrganizationMember member = memberService.addMember(orgId, newUserId, roleName, currentUserId);
            
            return ResponseEntity
                    .created(URI.create("/api/organizations/" + orgId + "/members/" + member.getId()))
                    .body(toResponse(member));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{memberId}")
    @Operation(summary = "Удалить участника из организации")
    public ResponseEntity<Void> remove(
            @PathVariable UUID orgId,
            @PathVariable UUID memberId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        tech.nicorp.pm.organizations.domain.OrgRole role = memberService.getUserOrgRole(orgId, userId).orElse(null);
        if (role == null || !memberService.canManageMembers(role)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            memberService.removeMember(memberId);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
             return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{memberId}")
    @Operation(summary = "Обновить роль участника")
    public ResponseEntity<OrganizationMemberResponse> updateRole(
            @PathVariable UUID orgId,
            @PathVariable UUID memberId,
            @RequestBody Map<String, String> body,
            Authentication auth) {

        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        tech.nicorp.pm.organizations.domain.OrgRole currentRole = memberService.getUserOrgRole(orgId, userId).orElse(null);
        if (currentRole == null || !memberService.canManageMembers(currentRole)) {
            return ResponseEntity.status(403).build();
        }

        String newRoleVal = body.get("role");
        if (newRoleVal == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            // Retrieve Organization to ensure role belongs to it
            // Logic to resolve Role:
            // 1. Try as UUID (Role ID)
            // 2. Try as Name (System Default or Custom)
            
            tech.nicorp.pm.organizations.domain.OrgRole targetRole = null;
            
            // Try as UUID
            try {
                UUID roleId = UUID.fromString(newRoleVal);
                targetRole = roleRepository.findById(roleId).orElse(null);
            } catch (IllegalArgumentException ignored) {}

            // Try as Name if not found
            if (targetRole == null) {
                targetRole = roleRepository.findByOrganizationIdAndName(orgId, newRoleVal).orElse(null);
            }

            if (targetRole == null || !targetRole.getOrganization().getId().equals(orgId)) {
                return ResponseEntity.badRequest().body(null); // Role not found or invalid
            }

            OrganizationMember updated = memberService.updateRole(memberId, targetRole.getId());
            return ResponseEntity.ok(toResponse(updated));

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private UUID extractUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) return null;
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private OrganizationMemberResponse toResponse(OrganizationMember member) {
        OrganizationMemberResponse response = new OrganizationMemberResponse();
        response.setId(member.getId());
        response.setOrganizationId(member.getOrganization().getId());
        response.setUserId(member.getUser().getId());
        
        if (member.getRole() != null) {
            response.setRole(member.getRole().getName().toUpperCase());
            
            tech.nicorp.pm.organizations.api.dto.OrgRoleResponse roleResp = new tech.nicorp.pm.organizations.api.dto.OrgRoleResponse();
            roleResp.setId(member.getRole().getId());
            roleResp.setName(member.getRole().getName());
            roleResp.setColor(member.getRole().getColor());
            roleResp.setPermissions(member.getRole().getPermissions());
            roleResp.setSystemDefault(member.getRole().isSystemDefault());
            roleResp.setOrganizationId(member.getRole().getOrganization().getId());
            response.setRoleDetails(roleResp);
            
        } else if (member.getRoleEnum() != null) {
             response.setRole(member.getRoleEnum().name());
        }

        response.setCorporateEmail(member.getCorporateEmail());
        response.setCorporateEmailVerified(member.getCorporateEmailVerified());
        
        response.setJoinedAt(member.getJoinedAt());
        response.setLastActiveAt(member.getLastActiveAt());
        
        if (member.getUser() != null) {
            OrganizationMemberResponse.UserBasicInfo userInfo = new OrganizationMemberResponse.UserBasicInfo();
            userInfo.setId(member.getUser().getId());
            userInfo.setUsername(member.getUser().getUsername());
            userInfo.setDisplayName(member.getUser().getDisplayName());
            response.setUser(userInfo);
        }
        
        return response;
    }
}
