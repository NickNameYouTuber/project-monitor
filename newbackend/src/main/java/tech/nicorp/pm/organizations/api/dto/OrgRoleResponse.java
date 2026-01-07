package tech.nicorp.pm.organizations.api.dto;

import lombok.Data;
import tech.nicorp.pm.organizations.domain.OrgPermission;
import java.util.Set;
import java.util.UUID;

@Data
public class OrgRoleResponse {
    private UUID id;
    private String name;
    private String color;
    private Set<OrgPermission> permissions;
    private boolean isSystemDefault;
    private UUID organizationId;
}
