package tech.nicorp.pm.organizations.domain;

import lombok.Getter;

@Getter
public enum OrgPermission {
    // === Views (Tabs) ===
    VIEW_SETTINGS_TAB("View Settings Tab", "Allows access to organization settings"),
    VIEW_MEMBERS_TAB("View Members Tab", "Allows viewing the list of organization members"),
    VIEW_BILLING_TAB("View Billing Tab", "Allows access to billing information"),
    VIEW_PROJECTS_TAB("View Projects Tab", "Allows viewing the projects list"),
    
    // === Actions ===
    MANAGE_ORG_DETAILS("Manage Organization Details", "Edit name, logo, domain settings"),
    MANAGE_ROLES("Manage Roles", "Create, edit, and delete organization roles"),
    MANAGE_MEMBERS("Manage Members", "Invite users, change roles, remove members"),
    MANAGE_BILLING("Manage Billing", "Update payment methods, change subscription"),
    CREATE_PROJECT("Create Project", "Create new projects in the organization"),
    DELETE_PROJECT("Delete Project", "Delete existing projects");

    private final String displayName;
    private final String description;

    OrgPermission(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }
}
