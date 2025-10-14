package tech.nicorp.pm.organizations.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class OrganizationMemberResponse {
    private UUID id;
    
    @JsonProperty("organization_id")
    private UUID organizationId;
    
    @JsonProperty("user_id")
    private UUID userId;
    
    private String role;
    
    @JsonProperty("corporate_email")
    private String corporateEmail;
    
    @JsonProperty("corporate_email_verified")
    private Boolean corporateEmailVerified;
    
    @JsonProperty("joined_at")
    private OffsetDateTime joinedAt;
    
    @JsonProperty("last_active_at")
    private OffsetDateTime lastActiveAt;
    
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

