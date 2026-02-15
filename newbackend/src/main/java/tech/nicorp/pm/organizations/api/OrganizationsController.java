package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.api.dto.OrganizationCreateRequest;
import tech.nicorp.pm.organizations.api.dto.OrganizationResponse;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.domain.OrganizationMember;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.repo.OrganizationMemberRepository;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;
import tech.nicorp.pm.organizations.service.OrganizationService;
import tech.nicorp.pm.security.JwtService;
import tech.nicorp.pm.sso.repo.SSOConfigurationRepository;
import tech.nicorp.pm.users.domain.User;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations")
@Tag(name = "Organizations", description = "Управление организациями")
public class OrganizationsController {

    private final OrganizationService organizationService;
    private final OrganizationMemberService memberService;
    private final SSOConfigurationRepository ssoConfigRepository;
    private final OrganizationMemberRepository memberRepository;
    private final JwtService jwtService;

    public OrganizationsController(
            OrganizationService organizationService,
            OrganizationMemberService memberService,
            SSOConfigurationRepository ssoConfigRepository,
            OrganizationMemberRepository memberRepository,
            JwtService jwtService) {
        this.organizationService = organizationService;
        this.memberService = memberService;
        this.ssoConfigRepository = ssoConfigRepository;
        this.memberRepository = memberRepository;
        this.jwtService = jwtService;
    }

    @GetMapping
    @Transactional
    @Operation(summary = "Список организаций текущего пользователя")
    public ResponseEntity<List<OrganizationResponse>> list(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            System.out.println("[OrganizationsController] list: auth is null, returning 401");
            return ResponseEntity.status(401).build();
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            System.out.println("[OrganizationsController] list: loading orgs for user " + userId);
            List<Organization> userOrgs = memberService.getUserOrganizations(userId);
            System.out.println("[OrganizationsController] list: found " + userOrgs.size() + " orgs");
            return ResponseEntity.ok(userOrgs.stream()
                    .map(org -> toResponse(org, userId))
                    .toList());
        } catch (IllegalArgumentException e) {
            System.err.println("[OrganizationsController] list: invalid user ID format: " + auth.getName());
            return ResponseEntity.status(401).build();
        }
    }

    @GetMapping("/{id}")
    @Transactional
    @Operation(summary = "Получить организацию по ID")
    public ResponseEntity<OrganizationResponse> get(@PathVariable UUID id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            System.out.println("[OrganizationsController] Auth is null or no name");
            return ResponseEntity.status(401).build();
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            System.out.println("[OrganizationsController] Checking access for user: " + userId + " to org: " + id);
            
            boolean hasAccess = memberService.hasAccess(id, userId);
            System.out.println("[OrganizationsController] hasAccess result: " + hasAccess);
            
            if (!hasAccess) {
                System.out.println("[OrganizationsController] Access denied for user: " + userId);
                return ResponseEntity.status(403).build();
            }
            
            Organization org = organizationService.getOrganization(id);
            return ResponseEntity.ok(toResponse(org, userId));
        } catch (IllegalArgumentException e) {
            System.out.println("[OrganizationsController] Exception: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    @Operation(summary = "Создать новую организацию")
    public ResponseEntity<?> create(
            @RequestBody OrganizationCreateRequest request, 
            Authentication auth) {
        
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            
            String slug = request.getSlug() != null 
                    ? request.getSlug() 
                    : organizationService.generateSlug(request.getName());
            
            // 1. Create Organization (Transactional)
            Organization org = organizationService.createOrganization(
                    request.getName(), 
                    slug, 
                    userId
            );
            
            // 2. Update optional fields (Transactional update)
            if (request.getDescription() != null) org.setDescription(request.getDescription());
            if (request.getLogoUrl() != null) org.setLogoUrl(request.getLogoUrl());
            if (request.getWebsite() != null) org.setWebsite(request.getWebsite());
            if (request.getCorporateDomain() != null) org.setCorporateDomain(request.getCorporateDomain());
            if (request.getRequireCorporateEmail() != null) org.setRequireCorporateEmail(request.getRequireCorporateEmail());
            
            org = organizationService.updateOrganization(org.getId(), org);
            
            // 3. Add Owner Member
            // Note: If this fails, we have a zombie organization. We should refactor to Service layer later.
            try {
                memberService.addMember(org.getId(), userId, "Owner", null);
            } catch (Exception e) {
                // Try to cleanup
                organizationService.deleteOrganization(org.getId());
                throw e;
            }
            
            if (Boolean.TRUE.equals(request.getRequirePassword()) && request.getPassword() != null) {
                organizationService.setOrganizationPassword(org.getId(), request.getPassword());
            }
            
            return ResponseEntity
                    .created(URI.create("/api/organizations/" + org.getId()))
                    .body(toResponse(org, userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/verify-password")
    @Transactional
    @Operation(summary = "Проверить пароль организации")
    public ResponseEntity<Map<String, Object>> verifyPassword(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            
            // Проверить членство
            OrganizationMember member = memberRepository.findByOrganizationIdAndUserId(id, userId)
                    .orElseThrow(() -> new IllegalArgumentException("Not a member"));
            
            // Проверить пароль
            String password = body.get("password");
            if (password == null) {
                return ResponseEntity.badRequest().build();
            }
            
            boolean isValid = organizationService.verifyOrganizationPassword(id, password);
            
            if (!isValid) {
                return ResponseEntity.status(403).body(Map.of("error", "invalid_password"));
            }
            
            // Создать новый JWT токен с org_verified claim и email
            User user = member.getUser();
            String newToken = jwtService.createTokenWithOrgVerification(
                userId.toString(), 
                id, 
                Map.of(
                    "username", user.getUsername(),
                    "email", user.getUsername()
                )
            );
            
            return ResponseEntity.ok(Map.of("token", newToken));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).build();
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить организацию")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            tech.nicorp.pm.organizations.domain.OrgRole role = memberService.getUserOrgRole(id, userId).orElse(null);
            
            if (role == null || !memberService.canDeleteOrganization(role)) {
                return ResponseEntity.status(403).build();
            }
            
            organizationService.deleteOrganization(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private OrganizationResponse toResponse(Organization org, UUID currentUserId) {
        OrganizationResponse response = new OrganizationResponse();
        response.setId(org.getId());
        response.setName(org.getName());
        response.setSlug(org.getSlug());
        response.setDescription(org.getDescription());
        response.setLogoUrl(org.getLogoUrl());
        response.setWebsite(org.getWebsite());
        response.setRequirePassword(org.getRequirePassword());
        response.setCorporateDomain(org.getCorporateDomain());
        response.setRequireCorporateEmail(org.getRequireCorporateEmail());
        response.setDefaultProjectRole(org.getDefaultProjectRole());
        response.setOwnerId(org.getOwner().getId());
        response.setCreatedAt(org.getCreatedAt());
        response.setUpdatedAt(org.getUpdatedAt());
        
        memberService.getUserRole(org.getId(), currentUserId)
                .ifPresent(role -> response.setCurrentUserRole(role.name()));
        
        ssoConfigRepository.findByOrganizationId(org.getId()).ifPresent(ssoConfig -> {
            response.setSsoEnabled(ssoConfig.getEnabled());
            response.setSsoRequireSSO(ssoConfig.getRequireSSO());
        });
        
        return response;
    }
}

