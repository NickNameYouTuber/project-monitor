package tech.nicorp.pm.tasks.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class TaskAssigneeInfo {
    private UUID id;
    private String username;
    @JsonProperty("display_name")
    private String displayName;
}

