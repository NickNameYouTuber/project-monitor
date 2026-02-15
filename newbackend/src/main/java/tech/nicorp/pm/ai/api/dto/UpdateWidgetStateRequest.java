package tech.nicorp.pm.ai.api.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateWidgetStateRequest {
    private String widgetId;
    private String widgetType;
    private String selectedValue;
}
