package tech.nicorp.pm.ai.api.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class SendMessageResponse {
    private ChatMessageResponse message;
    private List<Map<String, Object>> actions;
}
