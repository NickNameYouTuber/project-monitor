package tech.nicorp.pm.auth.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {
    @Schema(example = "newuser")
    private String username;

    @Schema(example = "Pa55w0rd!")
    private String password;

    @Schema(name = "display_name", example = "New User")
    private String display_name;
}



