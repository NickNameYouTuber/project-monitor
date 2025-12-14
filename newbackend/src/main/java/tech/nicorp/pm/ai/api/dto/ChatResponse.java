package tech.nicorp.pm.ai.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ChatResponse {
    private UUID id;
    private String title;
    @JsonProperty("organization_id")
    private UUID organizationId;
    @JsonProperty("project_id")
    private UUID projectId;
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
    @JsonProperty("updated_at")
    private OffsetDateTime updatedAt;
    private List<ChatMessageResponse> messages;
}
