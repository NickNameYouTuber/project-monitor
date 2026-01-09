package tech.nicorp.pm.ai.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class ChatMessageResponse {
    private UUID id;
    private String role;
    private String content;
    private List<Map<String, Object>> actions;
    private List<Map<String, Object>> widgets;
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
    @JsonProperty("isWidgetResponse")
    private boolean isWidgetResponse;
}
