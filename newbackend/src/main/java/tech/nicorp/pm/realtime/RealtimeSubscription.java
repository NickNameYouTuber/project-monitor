package tech.nicorp.pm.realtime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.UUID;

@Data
@AllArgsConstructor
@EqualsAndHashCode
public class RealtimeSubscription {
    private UUID userId;
    private UUID organizationId;
    private UUID projectId;
    
    public boolean matchesOrganization(UUID orgId) {
        return organizationId != null && organizationId.equals(orgId);
    }
    
    public boolean matchesProject(UUID projId) {
        return projectId != null && projectId.equals(projId);
    }
}

