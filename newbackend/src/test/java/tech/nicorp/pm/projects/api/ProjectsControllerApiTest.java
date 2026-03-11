package tech.nicorp.pm.projects.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tech.nicorp.pm.dashboards.repo.DashboardRepository;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.OrganizationMemberRepository;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.ProjectRole;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.service.ProjectMemberService;
import tech.nicorp.pm.realtime.RealtimeEventService;
import tech.nicorp.pm.security.OrganizationVerificationHelper;
import tech.nicorp.pm.support.TestDataFactory;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ProjectsControllerApiTest {

    @Mock
    private ProjectRepository projects;

    @Mock
    private UserRepository users;

    @Mock
    private DashboardRepository dashboards;

    @Mock
    private ProjectMemberService projectMemberService;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private OrganizationMemberRepository organizationMemberRepository;

    @Mock
    private OrganizationVerificationHelper verificationHelper;

    @Mock
    private RealtimeEventService realtimeEventService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        ProjectsController controller = new ProjectsController(
                projects,
                users,
                dashboards,
                projectMemberService,
                organizationRepository,
                organizationMemberRepository,
                verificationHelper,
                realtimeEventService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    @Test
    void listReturnsForbiddenWhenUserIsNotOrganizationMember() throws Exception {
        UUID organizationId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        UUID userId = UUID.fromString("44444444-4444-4444-4444-444444444444");
        Authentication auth = TestDataFactory.auth(userId);

        when(organizationMemberRepository.findByOrganizationIdAndUserId(organizationId, userId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/projects")
                        .param("organizationId", organizationId.toString())
                        .principal(auth))
                .andExpect(status().isForbidden());
    }

    @Test
    void createReturnsCreatedAndAddsOwnerMembership() throws Exception {
        UUID organizationId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        UUID userId = UUID.fromString("66666666-6666-6666-6666-666666666666");
        Authentication auth = TestDataFactory.auth(userId);
        User owner = TestDataFactory.user(userId, "owner@example.com");
        Organization organization = TestDataFactory.organization(organizationId, owner, "Platform QA", "platform-qa");

        when(users.findById(userId)).thenReturn(Optional.of(owner));
        when(organizationRepository.findById(organizationId)).thenReturn(Optional.of(organization));
        when(projects.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/projects")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateProjectRequest(
                                "Regression Dashboard",
                                "Tracks release readiness",
                                "inProgress",
                                "high",
                                "qa.lead",
                                2,
                                organizationId,
                                "#8b5cf6"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Regression Dashboard"))
                .andExpect(jsonPath("$.organization_id").value(organizationId.toString()))
                .andExpect(jsonPath("$.ownerId").value(userId.toString()))
                .andExpect(jsonPath("$.order").value(2));

        verify(projectMemberService).addMember(any(UUID.class), eq(userId), eq(ProjectRole.OWNER));
        verify(realtimeEventService).sendProjectCreated(eq(organizationId), any());
    }

    @Test
    void listReturnsOnlyProjectsForSelectedOrganization() throws Exception {
        UUID organizationId = UUID.fromString("77777777-7777-7777-7777-777777777777");
        UUID otherOrganizationId = UUID.fromString("88888888-8888-8888-8888-888888888888");
        UUID userId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        Authentication auth = TestDataFactory.auth(userId);
        User owner = TestDataFactory.user(userId, "viewer@example.com");
        Organization organization = TestDataFactory.organization(organizationId, owner, "Core Org", "core-org");
        Organization otherOrganization = TestDataFactory.organization(otherOrganizationId, owner, "Other Org", "other-org");
        Project visibleProject = TestDataFactory.project(UUID.fromString("10101010-1010-1010-1010-101010101010"), organization, owner, "Visible Project", 0);
        Project hiddenProject = TestDataFactory.project(UUID.fromString("20202020-2020-2020-2020-202020202020"), otherOrganization, owner, "Hidden Project", 1);

        when(organizationMemberRepository.findByOrganizationIdAndUserId(organizationId, userId))
                .thenReturn(Optional.of(TestDataFactory.organizationMember(organization, owner, "Owner")));
        when(verificationHelper.isVerified(organizationId, auth)).thenReturn(true);
        when(projectMemberService.getProjectsByUserId(userId)).thenReturn(List.of(visibleProject, hiddenProject));

        mockMvc.perform(get("/api/projects")
                        .param("organizationId", organizationId.toString())
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Visible Project"));
    }

    private record CreateProjectRequest(
            String name,
            String description,
            String status,
            String priority,
            String assignee,
            Integer order,
            UUID organization_id,
            String color
    ) {
    }
}
