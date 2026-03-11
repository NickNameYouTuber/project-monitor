package tech.nicorp.pm.tasks.api;

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
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.OrganizationMemberRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.repo.TaskColumnRepository;
import tech.nicorp.pm.repositories.repo.RepositoryRepository;
import tech.nicorp.pm.realtime.RealtimeEventService;
import tech.nicorp.pm.security.OrganizationVerificationHelper;
import tech.nicorp.pm.support.TestDataFactory;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;
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
import tech.nicorp.pm.tasks.api.dto.TaskResponse;

@ExtendWith(MockitoExtension.class)
class TasksControllerApiTest {

    @Mock
    private TaskRepository tasks;

    @Mock
    private ProjectRepository projects;

    @Mock
    private TaskColumnRepository columns;

    @Mock
    private RepositoryRepository repositories;

    @Mock
    private UserRepository users;

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
        TasksController controller = new TasksController(
                tasks,
                projects,
                columns,
                repositories,
                users,
                organizationMemberRepository,
                verificationHelper,
                realtimeEventService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    @Test
    void listTasksReturnsForbiddenWhenOrganizationVerificationIsMissing() throws Exception {
        UUID projectId = UUID.fromString("abababab-abab-abab-abab-abababababab");
        UUID userId = UUID.fromString("cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd");
        Authentication auth = TestDataFactory.auth(userId);
        User owner = TestDataFactory.user(userId, "member@example.com");
        Organization organization = TestDataFactory.organization(UUID.fromString("efefefef-efef-efef-efef-efefefefefef"), owner, "Secure Org", "secure-org");
        Project project = TestDataFactory.project(projectId, organization, owner, "Protected Project", 0);

        when(projects.findById(projectId)).thenReturn(Optional.of(project));
        when(organizationMemberRepository.findByOrganizationIdAndUserId(organization.getId(), userId))
                .thenReturn(Optional.of(TestDataFactory.organizationMember(organization, owner, "Owner")));
        when(verificationHelper.isVerified(organization.getId(), auth)).thenReturn(false);

        mockMvc.perform(get("/api/projects/{projectId}/tasks", projectId).principal(auth))
                .andExpect(status().isForbidden());
    }

    @Test
    void createTaskReturnsCreatedWhenAccessIsGranted() throws Exception {
        UUID projectId = UUID.fromString("12121212-1212-1212-1212-121212121212");
        UUID columnId = UUID.fromString("34343434-3434-3434-3434-343434343434");
        UUID userId = UUID.fromString("56565656-5656-5656-5656-565656565656");
        Authentication auth = TestDataFactory.auth(userId);
        User owner = TestDataFactory.user(userId, "owner@example.com");
        Organization organization = TestDataFactory.organization(UUID.fromString("78787878-7878-7878-7878-787878787878"), owner, "Delivery Org", "delivery-org");
        Project project = TestDataFactory.project(projectId, organization, owner, "Delivery Project", 0);
        TaskColumn column = TestDataFactory.column(columnId, project, "In Progress", 1);

        when(projects.findById(projectId)).thenReturn(Optional.of(project));
        when(columns.findById(columnId)).thenReturn(Optional.of(column));
        when(organizationMemberRepository.findByOrganizationIdAndUserId(organization.getId(), userId))
                .thenReturn(Optional.of(TestDataFactory.organizationMember(organization, owner, "Owner")));
        when(verificationHelper.isVerified(organization.getId(), auth)).thenReturn(true);
        when(tasks.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/projects/{projectId}/tasks", projectId)
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTaskRequest(
                                "Validate release checklist",
                                "Check blockers before demo",
                                columnId,
                                projectId,
                                3,
                                null,
                                null
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Validate release checklist"))
                .andExpect(jsonPath("$.column_id").value(columnId.toString()))
                .andExpect(jsonPath("$.project_id").value(projectId.toString()))
                .andExpect(jsonPath("$.order").value(3));

        verify(realtimeEventService).sendTaskCreated(eq(projectId), any(TaskResponse.class));
    }

    @Test
    void listTasksReturnsOrderedTasksForAuthorizedUser() throws Exception {
        UUID projectId = UUID.fromString("90909090-9090-9090-9090-909090909090");
        UUID columnId = UUID.fromString("91919191-9191-9191-9191-919191919191");
        UUID userId = UUID.fromString("92929292-9292-9292-9292-929292929292");
        Authentication auth = TestDataFactory.auth(userId);
        User owner = TestDataFactory.user(userId, "dev@example.com");
        Organization organization = TestDataFactory.organization(UUID.fromString("93939393-9393-9393-9393-939393939393"), owner, "Sprint Org", "sprint-org");
        Project project = TestDataFactory.project(projectId, organization, owner, "Sprint Board", 0);
        TaskColumn column = TestDataFactory.column(columnId, project, "To Do", 0);
        Task firstTask = TestDataFactory.task(UUID.fromString("94949494-9494-9494-9494-949494949494"), project, column, "Prepare test data", 0);
        Task secondTask = TestDataFactory.task(UUID.fromString("95959595-9595-9595-9595-959595959595"), project, column, "Run smoke suite", 1);

        when(projects.findById(projectId)).thenReturn(Optional.of(project));
        when(organizationMemberRepository.findByOrganizationIdAndUserId(organization.getId(), userId))
                .thenReturn(Optional.of(TestDataFactory.organizationMember(organization, owner, "Owner")));
        when(verificationHelper.isVerified(organization.getId(), auth)).thenReturn(true);
        when(tasks.findByProject_IdOrderByOrderIndexAsc(projectId)).thenReturn(List.of(firstTask, secondTask));

        mockMvc.perform(get("/api/projects/{projectId}/tasks", projectId).principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Prepare test data"))
                .andExpect(jsonPath("$[1].title").value("Run smoke suite"));
    }

    private record CreateTaskRequest(
            String title,
            String description,
            UUID column_id,
            UUID project_id,
            Integer order,
            UUID repository_id,
            String repository_branch
    ) {
    }
}
