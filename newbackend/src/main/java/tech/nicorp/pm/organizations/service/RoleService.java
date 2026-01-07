package tech.nicorp.pm.organizations.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.organizations.domain.OrgPermission;
import tech.nicorp.pm.organizations.domain.OrgRole;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.OrgRoleRepository;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final OrgRoleRepository roleRepository;

    public List<OrgRole> getRoles(UUID organizationId) {
        return roleRepository.findAllByOrganizationId(organizationId);
    }

    public OrgRole getRole(UUID roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found"));
    }

    @Transactional
    public OrgRole createRole(Organization organization, String name, String color, Set<OrgPermission> permissions) {
        OrgRole role = new OrgRole();
        role.setOrganization(organization);
        role.setName(name);
        role.setColor(color);
        role.setPermissions(permissions);
        role.setSystemDefault(false);
        return roleRepository.save(role);
    }

    @Transactional
    public OrgRole updateRole(UUID roleId, String name, String color, Set<OrgPermission> permissions) {
        OrgRole role = getRole(roleId);
        if (role.isSystemDefault()) {
            // Allow changing permissions but not logic-critical things if needed, 
            // but for safety prevent renaming "Owner" to avoid confusion.
            // For now, let's allow updating permissions only.
            role.setPermissions(permissions);
            role.setColor(color);
        } else {
            role.setName(name);
            role.setColor(color);
            role.setPermissions(permissions);
        }
        return roleRepository.save(role);
    }

    @Transactional
    public void deleteRole(UUID roleId) {
        OrgRole role = getRole(roleId);
        if (role.isSystemDefault()) {
            throw new RuntimeException("Cannot delete system default roles");
        }
        // TODO: Check if users are assigned to this role and migrate them?
        roleRepository.delete(role);
    }
    
    @Transactional
    public void createDefaultRoles(Organization organization) {
        // Owner - All permissions
        OrgRole owner = new OrgRole();
        owner.setName("Owner");
        owner.setColor("#ef4444"); // Red
        owner.setOrganization(organization);
        owner.setSystemDefault(true);
        owner.setPermissions(new HashSet<>(Arrays.asList(OrgPermission.values())));
        roleRepository.save(owner);

        // Admin - Manage Org, Members, Billing
        OrgRole admin = new OrgRole();
        admin.setName("Admin");
        admin.setColor("#f59e0b"); // Amber
        admin.setOrganization(organization);
        admin.setSystemDefault(true);
        Set<OrgPermission> adminPerms = new HashSet<>();
        adminPerms.add(OrgPermission.VIEW_SETTINGS_TAB);
        adminPerms.add(OrgPermission.VIEW_MEMBERS_TAB);
        adminPerms.add(OrgPermission.VIEW_BILLING_TAB);
        adminPerms.add(OrgPermission.VIEW_PROJECTS_TAB);
        adminPerms.add(OrgPermission.MANAGE_ORG_DETAILS);
        adminPerms.add(OrgPermission.MANAGE_ROLES);
        adminPerms.add(OrgPermission.MANAGE_MEMBERS);
        adminPerms.add(OrgPermission.MANAGE_BILLING);
        adminPerms.add(OrgPermission.CREATE_PROJECT);
        adminPerms.add(OrgPermission.DELETE_PROJECT);
        admin.setPermissions(adminPerms);
        roleRepository.save(admin);
        
        roleRepository.flush();

        // Member - Create Projects, View everything except Settings/Billing specific manage actions
        OrgRole member = new OrgRole();
        member.setName("Member");
        member.setColor("#3b82f6"); // Blue
        member.setOrganization(organization);
        member.setSystemDefault(true);
        Set<OrgPermission> memberPerms = new HashSet<>();
        memberPerms.add(OrgPermission.VIEW_MEMBERS_TAB);
        memberPerms.add(OrgPermission.VIEW_PROJECTS_TAB);
        memberPerms.add(OrgPermission.CREATE_PROJECT);
        member.setPermissions(memberPerms);
        roleRepository.save(member);
        
        // Guest - View Projects Only
        OrgRole guest = new OrgRole();
        guest.setName("Guest");
        guest.setColor("#9ca3af"); // Gray
        guest.setOrganization(organization);
        guest.setSystemDefault(true);
        Set<OrgPermission> guestPerms = new HashSet<>();
        guestPerms.add(OrgPermission.VIEW_PROJECTS_TAB);
        guest.setPermissions(guestPerms);
        roleRepository.save(guest);
    }
}
