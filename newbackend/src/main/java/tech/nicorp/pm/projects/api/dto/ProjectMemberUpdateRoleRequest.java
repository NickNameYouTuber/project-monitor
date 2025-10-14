package tech.nicorp.pm.projects.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectMemberUpdateRoleRequest {
    
    @Schema(required = true, example = "ADMIN", description = "Новая роль: OWNER, ADMIN, DEVELOPER, VIEWER")
    private String role;
}

