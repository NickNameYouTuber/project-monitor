package tech.nicorp.pm.calls.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
public class CallUpdateRequest {
    private String title;
    private String description;
    @JsonProperty("start_at")
    private OffsetDateTime startAt;
    @JsonProperty("end_at")
    private OffsetDateTime endAt;
}


