package tech.nicorp.pm.ai.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class SendMessageRequest {
    private String message;

    @JsonProperty("isWidgetResponse")
    private boolean isWidgetResponse;
}
