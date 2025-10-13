package tech.nicorp.pm.repositories.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class RepositoryResponse {
    private UUID id;
    private String name;
    @JsonProperty("default_branch")
    private String defaultBranch;
    @JsonProperty("clone_url")
    private String cloneUrl;
    private String visibility;
    private String description;
    @JsonProperty("project_id")
    private UUID projectId;
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
}


