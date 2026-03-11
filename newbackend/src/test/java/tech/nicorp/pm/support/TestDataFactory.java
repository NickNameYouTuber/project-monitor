package tech.nicorp.pm.support;

import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallParticipant;
import tech.nicorp.pm.calls.domain.CallStatus;
import tech.nicorp.pm.calls.domain.ParticipantRole;
import tech.nicorp.pm.organizations.domain.OrgRole;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.domain.OrganizationMember;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.users.domain.User;

import java.util.Set;
import java.util.UUID;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static Authentication auth(UUID userId) {
        return new TestingAuthenticationToken(userId.toString(), "test-token");
    }

    public static User user(UUID id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setDisplayName(username);
        return user;
    }

    public static Organization organization(UUID id, User owner, String name, String slug) {
        Organization organization = new Organization();
        organization.setId(id);
        organization.setOwner(owner);
        organization.setName(name);
        organization.setSlug(slug);
        organization.setDefaultProjectRole("DEVELOPER");
        return organization;
    }

    public static OrganizationMember organizationMember(Organization organization, User user, String roleName) {
        OrganizationMember member = new OrganizationMember();
        member.setOrganization(organization);
        member.setUser(user);

        OrgRole role = new OrgRole();
        role.setOrganization(organization);
        role.setName(roleName);
        role.setPermissions(Set.of());
        member.setRole(role);
        return member;
    }

    public static Project project(UUID id, Organization organization, User owner, String name, int orderIndex) {
        Project project = new Project();
        project.setId(id);
        project.setOrganization(organization);
        project.setOwner(owner);
        project.setName(name);
        project.setDescription("Project description");
        project.setStatus("inPlans");
        project.setPriority("medium");
        project.setOrderIndex(orderIndex);
        project.setColor("#6366f1");
        return project;
    }

    public static TaskColumn column(UUID id, Project project, String name, int orderIndex) {
        TaskColumn column = new TaskColumn();
        column.setId(id);
        column.setProject(project);
        column.setName(name);
        column.setOrderIndex(orderIndex);
        return column;
    }

    public static Task task(UUID id, Project project, TaskColumn column, String title, int orderIndex) {
        Task task = new Task();
        task.setId(id);
        task.setProject(project);
        task.setColumn(column);
        task.setTitle(title);
        task.setDescription("Task description");
        task.setOrderIndex(orderIndex);
        return task;
    }

    public static Call call(UUID id, String title, CallStatus status) {
        Call call = new Call();
        call.setId(id);
        call.setTitle(title);
        call.setRoomId("room-" + id);
        call.setStatus(status);
        return call;
    }

    public static CallParticipant participant(Call call, User user, ParticipantRole role) {
        CallParticipant participant = new CallParticipant();
        participant.setCall(call);
        participant.setUser(user);
        participant.setRole(role);
        return participant;
    }
}
