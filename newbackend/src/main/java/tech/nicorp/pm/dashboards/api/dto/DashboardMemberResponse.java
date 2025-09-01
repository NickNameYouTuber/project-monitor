package tech.nicorp.pm.dashboards.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class DashboardMemberResponse {
    private UUID id;
    private UUID dashboardId;
    private UUID userId;
    @Schema(example = "viewer")
    private String role;
    private boolean active;
    private OffsetDateTime createdAt;
}


