package tech.nicorp.pm.ai.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.Map;

@Data
public class AIAction {
    @JsonProperty("type")
    private String type;

    @JsonProperty("params")
    private Map<String, Object> params;

    private Map<String, Object> result;

    private ActionNotification notification;
}
