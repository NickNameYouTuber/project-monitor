package tech.nicorp.pm.calls.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
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
    @JsonProperty("start_at")
    private OffsetDateTime startAt;
    @JsonProperty("end_at")
    private OffsetDateTime endAt;
}


