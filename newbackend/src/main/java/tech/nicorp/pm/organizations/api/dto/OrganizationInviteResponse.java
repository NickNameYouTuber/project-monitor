package tech.nicorp.pm.organizations.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class OrganizationInviteResponse {
    private UUID id;
    
    @JsonProperty("organization_id")
    private UUID organizationId;
    
    @JsonProperty("organization_name")
    private String organizationName;
    
    private String token;
    private String role;
    
    @JsonProperty("max_uses")
    private Integer maxUses;
    
    @JsonProperty("current_uses")
    private Integer currentUses;
    
    @JsonProperty("expires_at")
    private OffsetDateTime expiresAt;
    
    @JsonProperty("email_domains")
    private String[] emailDomains;
    
    @JsonProperty("created_by")
    private UUID createdBy;
    
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
    
    private Boolean revoked;
    
    @JsonProperty("is_valid")
    private Boolean isValid;
}

