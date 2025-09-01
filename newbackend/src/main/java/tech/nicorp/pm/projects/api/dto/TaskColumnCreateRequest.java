package tech.nicorp.pm.projects.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskColumnCreateRequest {
    @Schema(example = "To Do")
    private String name;

    @JsonProperty("order")
    @Schema(example = "0")
    private Integer orderIndex;
}


