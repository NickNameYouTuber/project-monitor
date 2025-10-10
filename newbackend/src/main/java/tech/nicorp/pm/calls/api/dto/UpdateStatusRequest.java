package tech.nicorp.pm.calls.api.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateStatusRequest {
    private String status; // ACTIVE, COMPLETED, CANCELLED
}

