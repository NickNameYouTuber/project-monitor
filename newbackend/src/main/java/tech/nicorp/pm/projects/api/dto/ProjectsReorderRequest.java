package tech.nicorp.pm.projects.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectsReorderRequest {
    @Schema(example = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    private String projectId;
    @Schema(example = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    private String targetProjectId;
    @Schema(example = "above", description = "above|below")
    private String position;
}


