package tech.nicorp.pm.auth.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {
    @Schema(example = "test")
    private String username;

    @Schema(example = "test123")
    private String password;
}



