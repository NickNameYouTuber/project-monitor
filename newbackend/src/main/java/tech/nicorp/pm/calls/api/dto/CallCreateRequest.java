package tech.nicorp.pm.calls.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CallCreateRequest {
    @JsonProperty("room_id")
    private String roomId;
    private String title;
    private String description;
    @JsonProperty("project_id")
    private UUID projectId;
    @JsonProperty("task_id")
    private UUID taskId;
    @JsonProperty("start_at")
    private OffsetDateTime startAt;
    @JsonProperty("end_at")
    private OffsetDateTime endAt;
    @JsonProperty("scheduled_time")
    private OffsetDateTime scheduledTime;
    @JsonProperty("duration_minutes")
    private Integer durationMinutes;
    private String status;
    @JsonProperty("participant_ids")
    private List<UUID> participantIds;
    
    @JsonProperty("is_recurring")
    private Boolean isRecurring;
    
    @JsonProperty("recurrence_type")
    private String recurrenceType;
    
    @JsonProperty("recurrence_days")
    private List<Integer> recurrenceDays;
    
    @JsonProperty("recurrence_end_date")
    private OffsetDateTime recurrenceEndDate;
}


