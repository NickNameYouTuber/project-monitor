package tech.nicorp.pm.projects.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectUpdateRequest {
    @Schema(example = "Updated Project Name")
    private String name;

    @Schema(example = "Updated description")
    private String description;

    @Schema(example = "inProgress")
    private String status;

    @Schema(example = "high")
    private String priority;

    @Schema(example = "jane.doe")
    private String assignee;

    @Schema(name = "order", example = "3")
    private Integer orderIndex;

    @Schema(example = "2fcb5120-6b9d-4015-9f1f-9e51a4b0b4ce")
    private String dashboardId;

    @Schema(example = "#10b981")
    private String color;
}



