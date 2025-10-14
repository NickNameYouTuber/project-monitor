package tech.nicorp.pm.repositories.api.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UserBasicInfo {
    private UUID id;
    private String username;
    private String email;
}

