package tech.nicorp.pm.repositories.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class RepositoryMemberResponse {
    private UUID id;
    private UUID repositoryId;
    private UUID userId;
    @Schema(example = "developer")
    private String role;
    private OffsetDateTime createdAt;
    private UserBasicInfo user;
}


