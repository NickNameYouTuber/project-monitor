package tech.nicorp.pm.projects.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskColumnCreateRequest {
    @JsonProperty("project_id")
    @Schema(example = "0f5fe59a-908c-4076-8b90-177e401eaf1b")
    private java.util.UUID projectId;
    @Schema(example = "To Do")
    private String name;

    @JsonProperty("order")
    @Schema(example = "0")
    private Integer orderIndex;
}


