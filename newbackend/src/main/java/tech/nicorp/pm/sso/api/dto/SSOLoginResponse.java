package tech.nicorp.pm.sso.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SSOLoginResponse {
    
    @JsonProperty("authorization_url")
    private String authorizationUrl;
    
    private String state;
}

