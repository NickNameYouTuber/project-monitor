package tech.nicorp.pm.dashboards.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class DashboardResponse {
    @Schema(example = "6142a71c-1521-49f2-b68b-10e5c93b3e9d")
    private UUID id;

    @Schema(example = "Team Board")
    private String name;

    @Schema(example = "Board for team projects")
    private String description;

    @Schema(example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID ownerId;

    private OffsetDateTime createdAt;
}


