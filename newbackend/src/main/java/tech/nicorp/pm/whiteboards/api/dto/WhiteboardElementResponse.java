package tech.nicorp.pm.whiteboards.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class WhiteboardElementResponse {
    private UUID id;
    @JsonProperty("board_id")
    private UUID boardId;
    private String type;
    private int x;
    private int y;
    private int width;
    private int height;
    private int rotation;
    @JsonProperty("z_index")
    private int zIndex;
    private String text;
    private String fill;
    @JsonProperty("text_color")
    private String textColor;
    @JsonProperty("font_family")
    private String fontFamily;
    @JsonProperty("font_size")
    private int fontSize;
    @JsonProperty("task_id")
    private UUID taskId;
}


