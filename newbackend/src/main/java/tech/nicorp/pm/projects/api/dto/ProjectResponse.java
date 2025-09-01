package tech.nicorp.pm.projects.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class ProjectResponse {
    @Schema(example = "5f6d5b8b-6d3b-4a1c-9b9c-6b1b2a3c4d5e")
    private UUID id;

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

    @Schema(example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID ownerId;

    @Schema(example = "2fcb5120-6b9d-4015-9f1f-9e51a4b0b4ce")
    private UUID dashboardId;

    private OffsetDateTime createdAt;
}



