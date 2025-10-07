package tech.nicorp.pm.tasks.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class TaskCreateFromChatRequest {
    private String title;
    private String description;
    
    @JsonProperty("assignee_username")
    private String assigneeUsername;
    
    @JsonProperty("watcher_username")
    private String watcherUsername;
    
    private OffsetDateTime deadline;
    
    @JsonProperty("project_id")
    private UUID projectId;
    
    @JsonProperty("parent_task_id")
    private UUID parentTaskId;
    
    @JsonProperty("room_id")
    private String roomId;
}
