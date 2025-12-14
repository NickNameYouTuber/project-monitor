package tech.nicorp.pm.ai.api.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ChatCreateRequest {
    private String title;
    private UUID organizationId;
    private UUID projectId;
}
