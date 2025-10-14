package tech.nicorp.pm.projects.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectMemberCreateRequest {
    
    @JsonProperty("user_id")
    @Schema(required = true, description = "ID пользователя")
    private String userId;
    
    @Schema(example = "DEVELOPER", description = "Роль: OWNER, ADMIN, DEVELOPER, VIEWER")
    private String role;
}

