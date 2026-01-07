package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.nicorp.pm.organizations.domain.OrgPermission;
import tech.nicorp.pm.organizations.service.PermissionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
@Tag(name = "Permissions", description = "System permissions")
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    @Operation(summary = "List all available permissions")
    public List<OrgPermission> listPermissions() {
        return permissionService.getAllPermissions();
    }
    
    @GetMapping("/grouped")
    @Operation(summary = "List permissions grouped by category")
    public Map<String, List<OrgPermission>> listGroupedPermissions() {
        return permissionService.getGroupedPermissions();
    }
}
