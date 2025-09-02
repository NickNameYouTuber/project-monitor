package tech.nicorp.pm.tasks.api.dto;

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
    private UUID columnId;
    private UUID projectId;
    private Integer order; // orderIndex
    private UUID reviewerId;
    private OffsetDateTime dueDate;
    private Integer estimateMinutes;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}


