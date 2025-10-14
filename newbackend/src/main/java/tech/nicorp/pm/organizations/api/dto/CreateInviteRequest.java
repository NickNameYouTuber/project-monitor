package tech.nicorp.pm.organizations.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
public class CreateInviteRequest {
    private String role;
    
    @JsonProperty("max_uses")
    private Integer maxUses;
    
    @JsonProperty("expires_at")
    private OffsetDateTime expiresAt;
    
    @JsonProperty("email_domains")
    private String[] emailDomains;
}

