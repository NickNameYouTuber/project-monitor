package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.api.dto.CreateInviteRequest;
import tech.nicorp.pm.organizations.api.dto.OrganizationInviteResponse;
import tech.nicorp.pm.organizations.api.dto.OrganizationMemberResponse;
import tech.nicorp.pm.organizations.domain.OrganizationInvite;
import tech.nicorp.pm.organizations.domain.OrganizationMember;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.service.OrganizationInviteService;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Organization Invites", description = "Управление приглашениями в организации")
public class OrganizationInvitesController {

    private final OrganizationInviteService inviteService;
    private final OrganizationMemberService memberService;

    public OrganizationInvitesController(
            OrganizationInviteService inviteService,
            OrganizationMemberService memberService) {
        this.inviteService = inviteService;
        this.memberService = memberService;
    }

    @GetMapping("/api/organizations/{orgId}/invites")
    @Transactional
    @Operation(summary = "Список приглашений организации")
    public ResponseEntity<List<OrganizationInviteResponse>> list(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null || !memberService.hasAccess(orgId, userId)) {
            return ResponseEntity.status(403).build();
        }
        
        List<OrganizationInvite> invites = inviteService.getOrganizationInvites(orgId);
        return ResponseEntity.ok(invites.stream().map(this::toResponse).toList());
    }

    @PostMapping("/api/organizations/{orgId}/invites")
    @Operation(summary = "Создать приглашение")
    public ResponseEntity<OrganizationInviteResponse> create(
            @PathVariable UUID orgId,
            @RequestBody CreateInviteRequest request,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role == null || !memberService.canCreateInvites(role)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            OrganizationRole inviteRole = request.getRole() != null
                    ? OrganizationRole.valueOf(request.getRole())
                    : OrganizationRole.MEMBER;
            
            OrganizationInvite invite = inviteService.createInvite(
                    orgId,
                    userId,
                    inviteRole,
                    request.getMaxUses(),
                    request.getExpiresAt()
            );
            
            if (request.getEmailDomains() != null) {
                invite.setEmailDomains(request.getEmailDomains());
            }
            
            return ResponseEntity
                    .created(URI.create("/api/organizations/" + orgId + "/invites/" + invite.getId()))
                    .body(toResponse(invite));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/api/invites/{token}")
    @Transactional
    @Operation(summary = "Информация о приглашении (публичный эндпоинт)")
    public ResponseEntity<OrganizationInviteResponse> getInviteInfo(@PathVariable String token) {
        try {
            OrganizationInvite invite = inviteService.validateInvite(token);
            return ResponseEntity.ok(toResponse(invite));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/api/invites/{token}/accept")
    @Operation(summary = "Принять приглашение")
    public ResponseEntity<OrganizationMemberResponse> acceptInvite(
            @PathVariable String token,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            OrganizationMember member = inviteService.acceptInvite(token, userId);
            
            OrganizationMemberResponse response = new OrganizationMemberResponse();
            response.setId(member.getId());
            response.setOrganizationId(member.getOrganization().getId());
            response.setUserId(member.getUser().getId());
            response.setRole(member.getRole());
            response.setJoinedAt(member.getJoinedAt());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/api/organizations/{orgId}/invites/{inviteId}")
    @Operation(summary = "Отозвать приглашение")
    public ResponseEntity<Void> revoke(
            @PathVariable UUID orgId,
            @PathVariable UUID inviteId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role == null || !memberService.canManageMembers(role)) {
            return ResponseEntity.status(403).build();
        }
        
        inviteService.revokeInvite(inviteId, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID extractUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) return null;
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private OrganizationInviteResponse toResponse(OrganizationInvite invite) {
        OrganizationInviteResponse response = new OrganizationInviteResponse();
        response.setId(invite.getId());
        response.setOrganizationId(invite.getOrganization().getId());
        response.setOrganizationName(invite.getOrganization().getName());
        response.setToken(invite.getToken());
        response.setRole(invite.getRole());
        response.setMaxUses(invite.getMaxUses());
        response.setCurrentUses(invite.getCurrentUses());
        response.setExpiresAt(invite.getExpiresAt());
        response.setEmailDomains(invite.getEmailDomains());
        response.setCreatedBy(invite.getCreatedBy().getId());
        response.setCreatedAt(invite.getCreatedAt());
        response.setRevoked(invite.getRevoked());
        
        boolean isValid = !Boolean.TRUE.equals(invite.getRevoked())
                && (invite.getExpiresAt() == null || invite.getExpiresAt().isAfter(OffsetDateTime.now()))
                && (invite.getMaxUses() == null || invite.getCurrentUses() < invite.getMaxUses());
        response.setIsValid(isValid);
        
        return response;
    }
}

