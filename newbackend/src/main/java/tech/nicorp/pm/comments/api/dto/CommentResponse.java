package tech.nicorp.pm.comments.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class CommentResponse {
    private UUID id;
    @Schema(example = "Task looks good!")
    private String content;
    private UUID taskId;
    private UUID userId;
    private boolean system;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    @Schema(example = "test")
    private String username;
}


