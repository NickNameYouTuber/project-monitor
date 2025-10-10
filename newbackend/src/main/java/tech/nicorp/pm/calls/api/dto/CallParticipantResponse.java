package tech.nicorp.pm.calls.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CallParticipantResponse {
    private UUID id;
    private UserSummary user;
    private String role;
    private String status;
    @JsonProperty("invited_at")
    private OffsetDateTime invitedAt;
    @JsonProperty("joined_at")
    private OffsetDateTime joinedAt;
    @JsonProperty("left_at")
    private OffsetDateTime leftAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private UUID id;
        private String username;
        @JsonProperty("display_name")
        private String displayName;
        private String avatar;
    }
}

