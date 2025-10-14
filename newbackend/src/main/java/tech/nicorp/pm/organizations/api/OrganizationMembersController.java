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

    public OrganizationMembersController(OrganizationMemberService memberService) {
        this.memberService = memberService;
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
        
        OrganizationRole currentRole = memberService.getUserRole(orgId, currentUserId).orElse(null);
        if (currentRole == null || !memberService.canManageMembers(currentRole)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            UUID newUserId = UUID.fromString(body.get("user_id"));
            OrganizationRole newRole = OrganizationRole.valueOf(body.getOrDefault("role", "MEMBER"));
            
            OrganizationMember member = memberService.addMember(orgId, newUserId, newRole, currentUserId);
            
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
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
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
        response.setRole(member.getRole());
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

