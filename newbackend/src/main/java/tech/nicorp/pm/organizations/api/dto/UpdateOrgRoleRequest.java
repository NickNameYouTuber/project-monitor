package tech.nicorp.pm.organizations.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import tech.nicorp.pm.organizations.domain.OrgPermission;

import java.util.Set;

@Data
public class UpdateOrgRoleRequest {
    private String name;
    private String color;
    
    @NotNull
    private Set<OrgPermission> permissions;
}
