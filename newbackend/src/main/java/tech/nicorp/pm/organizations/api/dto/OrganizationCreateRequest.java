package tech.nicorp.pm.organizations.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizationCreateRequest {
    private String name;
    private String slug;
    private String description;
    
    @JsonProperty("logo_url")
    private String logoUrl;
    
    private String website;
    
    @JsonProperty("require_password")
    private Boolean requirePassword;
    
    private String password;
    
    @JsonProperty("corporate_domain")
    private String corporateDomain;
    
    @JsonProperty("require_corporate_email")
    private Boolean requireCorporateEmail;
}

