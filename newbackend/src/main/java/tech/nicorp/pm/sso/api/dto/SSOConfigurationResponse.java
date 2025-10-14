package tech.nicorp.pm.sso.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class SSOConfigurationResponse {
    
    private UUID id;
    
    @JsonProperty("organization_id")
    private UUID organizationId;
    
    @JsonProperty("provider_type")
    private String providerType;
    
    private Boolean enabled;
    
    @JsonProperty("client_id")
    private String clientId;
    
    @JsonProperty("authorization_endpoint")
    private String authorizationEndpoint;
    
    @JsonProperty("token_endpoint")
    private String tokenEndpoint;
    
    @JsonProperty("userinfo_endpoint")
    private String userinfoEndpoint;
    
    private String issuer;
    
    @JsonProperty("jwks_uri")
    private String jwksUri;
    
    @JsonProperty("email_claim")
    private String emailClaim;
    
    @JsonProperty("name_claim")
    private String nameClaim;
    
    @JsonProperty("sub_claim")
    private String subClaim;
    
    private String scopes;
    
    @JsonProperty("require_sso")
    private Boolean requireSSO;
}

