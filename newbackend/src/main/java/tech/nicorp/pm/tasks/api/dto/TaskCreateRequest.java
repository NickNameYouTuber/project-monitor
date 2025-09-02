package tech.nicorp.pm.tasks.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class TaskCreateRequest {
    private String title;
    private String description;
    @JsonProperty("column_id")
    private UUID columnId;
    @JsonProperty("project_id")
    private UUID projectId;
    private Integer order;
}


