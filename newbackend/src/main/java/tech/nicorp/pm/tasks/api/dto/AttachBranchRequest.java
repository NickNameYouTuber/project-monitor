package tech.nicorp.pm.tasks.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AttachBranchRequest {
    @Schema(example = "2fcb5120-6b9d-4015-9f1f-9e51a4b0b4ce")
    private String repositoryId;

    @Schema(example = "feature/PM-123-add-login")
    private String branch;
}


