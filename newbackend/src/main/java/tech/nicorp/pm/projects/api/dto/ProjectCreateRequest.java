package tech.nicorp.pm.projects.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectCreateRequest {
    @Schema(example = "New Project")
    private String name;

    @Schema(example = "Short description")
    private String description;

    @Schema(example = "inPlans")
    private String status;

    @Schema(example = "medium")
    private String priority;

    @Schema(example = "john.doe")
    private String assignee;

    @JsonProperty("order")
    @Schema(example = "0")
    private Integer orderIndex;

    @Schema(example = "2fcb5120-6b9d-4015-9f1f-9e51a4b0b4ce")
    private String dashboardId;

    @JsonProperty("organization_id")
    @Schema(example = "3fcb5120-6b9d-4015-9f1f-9e51a4b0b4ce")
    private java.util.UUID organizationId;

    @Schema(example = "#6366f1")
    private String color;
}



