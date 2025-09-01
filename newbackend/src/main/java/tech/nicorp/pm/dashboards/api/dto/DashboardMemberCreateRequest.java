package tech.nicorp.pm.dashboards.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DashboardMemberCreateRequest {
    @Schema(example = "550e8400-e29b-41d4-a716-446655440000")
    private String userId;

    @Schema(example = "viewer")
    private String role;
}


