package tech.nicorp.pm.whiteboards.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class WhiteboardResponse {
    private UUID id;
    @JsonProperty("project_id")
    private UUID projectId;
    private List<WhiteboardElementResponse> elements;
    private List<WhiteboardConnectionResponse> connections;
}


