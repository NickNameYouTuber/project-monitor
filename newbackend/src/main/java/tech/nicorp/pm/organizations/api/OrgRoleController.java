package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.api.dto.CreateOrgRoleRequest;
import tech.nicorp.pm.organizations.api.dto.OrgRoleResponse;
import tech.nicorp.pm.organizations.api.dto.UpdateOrgRoleRequest;
import tech.nicorp.pm.organizations.domain.OrgRole;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;
import tech.nicorp.pm.organizations.service.OrganizationService;
import tech.nicorp.pm.organizations.service.RoleService;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.service.UserService;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/organizations/{organizationId}/roles")
@RequiredArgsConstructor
@Tag(name = "Organization Roles", description = "Manage organization roles and permissions")
public class OrgRoleController {

    private final RoleService roleService;
    private final OrganizationService organizationService;
    private final OrganizationMemberService memberService;
    private final UserService userService;

    @GetMapping
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List organization roles")
    public ResponseEntity<?> listRoles(@PathVariable UUID organizationId) {
        try {
            User currentUser = userService.getCurrentUser();
            if (!memberService.hasAccess(organizationId, currentUser.getId())) {
                 return ResponseEntity.status(403).body("Access denied");
            }
            
            List<OrgRoleResponse> roles = roleService.getRoles(organizationId).stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
                    
            return ResponseEntity.ok(roles);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping
    @Transactional
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new role")
    public OrgRoleResponse createRole(
            @PathVariable UUID organizationId,
            @Valid @RequestBody CreateOrgRoleRequest request) {
//...
    }

    @PutMapping("/{roleId}")
    @Transactional
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update a role")
    public OrgRoleResponse updateRole(
            @PathVariable UUID organizationId,
            @PathVariable UUID roleId,
            @Valid @RequestBody UpdateOrgRoleRequest request) {
//...
    }

    @DeleteMapping("/{roleId}")
    @Transactional
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a role")
    public ResponseEntity<Void> deleteRole(
            @PathVariable UUID organizationId,
            @PathVariable UUID roleId) {
//...
    }

    private void checkPermission(UUID orgId, UUID userId, tech.nicorp.pm.organizations.domain.OrgPermission permission) {
        var member = memberService.getMember(orgId, userId)
                .orElseThrow(() -> new RuntimeException("Not a member of organization"));
        
        if (!member.getRole().getPermissions().contains(permission)) {
            throw new RuntimeException("Missing permission: " + permission);
        }
    }

    private OrgRoleResponse toResponse(OrgRole role) {
        OrgRoleResponse res = new OrgRoleResponse();
        res.setId(role.getId());
        res.setName(role.getName());
        res.setColor(role.getColor());
        res.setPermissions(role.getPermissions());
        res.setSystemDefault(role.isSystemDefault());
        if (role.getOrganization() != null) {
            res.setOrganizationId(role.getOrganization().getId());
        }
        return res;
    }
}
