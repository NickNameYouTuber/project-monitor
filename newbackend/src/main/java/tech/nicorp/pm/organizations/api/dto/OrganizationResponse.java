package tech.nicorp.pm.organizations.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class OrganizationResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    
    @JsonProperty("logo_url")
    private String logoUrl;
    
    private String website;
    
    @JsonProperty("require_password")
    private Boolean requirePassword;
    
    @JsonProperty("corporate_domain")
    private String corporateDomain;
    
    @JsonProperty("require_corporate_email")
    private Boolean requireCorporateEmail;
    
    @JsonProperty("default_project_role")
    private String defaultProjectRole;
    
    @JsonProperty("owner_id")
    private UUID ownerId;
    
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
    
    @JsonProperty("updated_at")
    private OffsetDateTime updatedAt;
    
    @JsonProperty("member_count")
    private Long memberCount;
    
    @JsonProperty("project_count")
    private Long projectCount;
    
    @JsonProperty("current_user_role")
    private String currentUserRole;
    
    @JsonProperty("sso_enabled")
    private Boolean ssoEnabled;
    
    @JsonProperty("sso_require_sso")
    private Boolean ssoRequireSSO;
}

