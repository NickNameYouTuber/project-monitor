package tech.nicorp.pm.ai.api.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
public class WidgetStateResponse {
    private UUID id;
    private String widgetId;
    private String widgetType;
    private String selectedValue;
    private OffsetDateTime selectedAt;
}
