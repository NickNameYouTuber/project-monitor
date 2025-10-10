package tech.nicorp.pm.calls.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CheckAccessResponse {
    @JsonProperty("has_access")
    private boolean hasAccess;
    private String role; // ORGANIZER or PARTICIPANT
}

