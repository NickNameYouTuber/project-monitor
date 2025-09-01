package tech.nicorp.pm.dashboards.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DashboardCreateRequest {
    @Schema(example = "Team Board")
    private String name;

    @Schema(example = "Board for team projects")
    private String description;
}



