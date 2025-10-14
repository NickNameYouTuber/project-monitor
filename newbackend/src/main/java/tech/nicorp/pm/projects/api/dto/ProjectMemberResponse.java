package tech.nicorp.pm.projects.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class ProjectMemberResponse {
    
    private UUID id;
    
    @JsonProperty("project_id")
    private UUID projectId;
    
    @JsonProperty("user_id")
    private UUID userId;
    
    @Schema(example = "DEVELOPER", description = "Роль участника: OWNER, ADMIN, DEVELOPER, VIEWER")
    private String role;
    
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
    
    @JsonProperty("user")
    private UserBasicInfo user;
    
    @Getter
    @Setter
    public static class UserBasicInfo {
        private UUID id;
        private String username;
        @JsonProperty("display_name")
        private String displayName;
    }
}

