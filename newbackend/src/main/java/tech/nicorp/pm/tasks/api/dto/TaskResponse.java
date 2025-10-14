package tech.nicorp.pm.tasks.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    @JsonProperty("column_id")
    private UUID columnId;
    @JsonProperty("project_id")
    private UUID projectId;
    @JsonProperty("order")
    private Integer order; // orderIndex
    @JsonProperty("reviewer_id")
    private UUID reviewerId;
    @JsonProperty("due_date")
    private OffsetDateTime dueDate;
    @JsonProperty("estimate_minutes")
    private Integer estimateMinutes;
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
    @JsonProperty("updated_at")
    private OffsetDateTime updatedAt;
    @JsonProperty("repository_id")
    private UUID repositoryId;
    @JsonProperty("repository_branch")
    private String repositoryBranch;
    @JsonProperty("repository_info")
    private TaskRepositoryInfo repositoryInfo;
    @JsonProperty("assignee_id")
    private UUID assigneeId;
    @JsonProperty("assignee")
    private TaskAssigneeInfo assignee;
}


