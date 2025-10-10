package tech.nicorp.pm.calls.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AddParticipantRequest {
    @JsonProperty("user_id")
    private UUID userId;
    private String role; // ORGANIZER or PARTICIPANT
}

