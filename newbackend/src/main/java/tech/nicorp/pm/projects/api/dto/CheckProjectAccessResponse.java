package tech.nicorp.pm.projects.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CheckProjectAccessResponse {
    
    @JsonProperty("has_access")
    private boolean hasAccess;
    
    private String role;
    
    @JsonProperty("can_edit_project")
    private boolean canEditProject;
    
    @JsonProperty("can_delete_project")
    private boolean canDeleteProject;
    
    @JsonProperty("can_manage_members")
    private boolean canManageMembers;
    
    @JsonProperty("can_create_tasks")
    private boolean canCreateTasks;
    
    @JsonProperty("can_edit_tasks")
    private boolean canEditTasks;
}

