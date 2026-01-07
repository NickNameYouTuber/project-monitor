package tech.nicorp.pm.organizations.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import tech.nicorp.pm.organizations.domain.OrgPermission;

import java.util.Set;

@Data
public class CreateOrgRoleRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    private String color;
    
    @NotNull
    private Set<OrgPermission> permissions;
}
