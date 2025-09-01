package tech.nicorp.pm.comments.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CommentCreateRequest {
    @Schema(example = "Task looks good!")
    private String content;

    @Schema(example = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    private UUID taskId;
}


