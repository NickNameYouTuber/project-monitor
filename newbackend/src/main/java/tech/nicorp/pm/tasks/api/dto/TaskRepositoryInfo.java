package tech.nicorp.pm.tasks.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class TaskRepositoryInfo {
    @JsonProperty("repository_id")
    private UUID repositoryId;
    
    @JsonProperty("repository_name")
    private String repositoryName;
    
    private String branch;
}

