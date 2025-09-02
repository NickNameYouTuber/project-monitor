package tech.nicorp.pm.whiteboards.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class WhiteboardConnectionResponse {
    private UUID id;
    @JsonProperty("board_id")
    private UUID boardId;
    @JsonProperty("from_element_id")
    private UUID fromElementId;
    @JsonProperty("to_element_id")
    private UUID toElementId;
    private String stroke;
    @JsonProperty("stroke_width")
    private Integer strokeWidth;
    private String points;
}


