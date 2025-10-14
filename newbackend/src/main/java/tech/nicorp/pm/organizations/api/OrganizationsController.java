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
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;
import tech.nicorp.pm.organizations.service.OrganizationService;

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

    public OrganizationsController(
            OrganizationService organizationService,
            OrganizationMemberService memberService) {
        this.organizationService = organizationService;
        this.memberService = memberService;
    }

    @GetMapping
    @Transactional
    @Operation(summary = "Список организаций текущего пользователя")
    public ResponseEntity<List<OrganizationResponse>> list(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.ok(List.of());
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            List<Organization> userOrgs = memberService.getUserOrganizations(userId);
            return ResponseEntity.ok(userOrgs.stream().map(this::toResponse).toList());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/{id}")
    @Transactional
    @Operation(summary = "Получить организацию по ID")
    public ResponseEntity<OrganizationResponse> get(@PathVariable UUID id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            if (!memberService.hasAccess(id, userId)) {
                return ResponseEntity.status(403).build();
            }
            
            Organization org = organizationService.getOrganization(id);
            return ResponseEntity.ok(toResponse(org));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    @Operation(summary = "Создать новую организацию")
    public ResponseEntity<OrganizationResponse> create(
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
            
            Organization org = organizationService.createOrganization(
                    request.getName(), 
                    slug, 
                    userId
            );
            
            if (request.getDescription() != null) org.setDescription(request.getDescription());
            if (request.getLogoUrl() != null) org.setLogoUrl(request.getLogoUrl());
            if (request.getWebsite() != null) org.setWebsite(request.getWebsite());
            if (request.getCorporateDomain() != null) org.setCorporateDomain(request.getCorporateDomain());
            if (request.getRequireCorporateEmail() != null) org.setRequireCorporateEmail(request.getRequireCorporateEmail());
            
            memberService.addMember(org.getId(), userId, OrganizationRole.OWNER, null);
            
            if (Boolean.TRUE.equals(request.getRequirePassword()) && request.getPassword() != null) {
                organizationService.setOrganizationPassword(org.getId(), request.getPassword());
            }
            
            return ResponseEntity
                    .created(URI.create("/api/organizations/" + org.getId()))
                    .body(toResponse(org));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/verify-password")
    @Operation(summary = "Проверить пароль организации")
    public ResponseEntity<Map<String, Boolean>> verifyPassword(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        
        String password = body.get("password");
        if (password == null) {
            return ResponseEntity.badRequest().build();
        }
        
        boolean valid = organizationService.verifyOrganizationPassword(id, password);
        return ResponseEntity.ok(Map.of("valid", valid));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить организацию")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            UUID userId = UUID.fromString(auth.getName());
            OrganizationRole role = memberService.getUserRole(id, userId).orElse(null);
            
            if (role == null || !memberService.canDeleteOrganization(role)) {
                return ResponseEntity.status(403).build();
            }
            
            organizationService.deleteOrganization(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private OrganizationResponse toResponse(Organization org) {
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
        return response;
    }
}

