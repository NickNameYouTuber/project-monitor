package tech.nicorp.pm.organizations.api;

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
import tech.nicorp.pm.organizations.domain.OrganizationMember;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;
import tech.nicorp.pm.organizations.service.OrganizationService;
import tech.nicorp.pm.security.JwtService;
import tech.nicorp.pm.sso.repo.SSOConfigurationRepository;
import tech.nicorp.pm.support.TestDataFactory;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.organizations.repo.OrganizationMemberRepository;

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
class OrganizationsControllerApiTest {

    @Mock
    private OrganizationService organizationService;

    @Mock
    private OrganizationMemberService memberService;

    @Mock
    private SSOConfigurationRepository ssoConfigRepository;

    @Mock
    private OrganizationMemberRepository memberRepository;

    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        OrganizationsController controller = new OrganizationsController(
                organizationService,
                memberService,
                ssoConfigRepository,
                memberRepository,
                jwtService
        );

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    @Test
    void listReturnsUnauthorizedWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/organizations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createReturnsCreatedAndUsesGeneratedSlug() throws Exception {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        Authentication auth = TestDataFactory.auth(userId);
        User owner = TestDataFactory.user(userId, "owner@example.com");
        Organization organization = TestDataFactory.organization(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                owner,
                "QA Guild",
                "qa-guild"
        );
        OrganizationMember member = TestDataFactory.organizationMember(organization, owner, "Owner");

        when(organizationService.generateSlug("QA Guild")).thenReturn("qa-guild");
        when(organizationService.createOrganization("QA Guild", "qa-guild", userId)).thenReturn(organization);
        when(organizationService.updateOrganization(eq(organization.getId()), any(Organization.class))).thenReturn(organization);
        when(memberService.addMember(organization.getId(), userId, "Owner", null)).thenReturn(member);
        when(memberService.getUserRole(organization.getId(), userId)).thenReturn(Optional.of(OrganizationRole.OWNER));
        when(ssoConfigRepository.findByOrganizationId(organization.getId())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/organizations")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateOrgRequest("QA Guild", null, "Team for testing", false, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("QA Guild"))
                .andExpect(jsonPath("$.slug").value("qa-guild"))
                .andExpect(jsonPath("$.owner_id").value(userId.toString()))
                .andExpect(jsonPath("$.current_user_role").value("OWNER"));

        verify(memberService).addMember(organization.getId(), userId, "Owner", null);
    }

    @Test
    void listReturnsCurrentUserOrganizations() throws Exception {
        UUID userId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        Authentication auth = TestDataFactory.auth(userId);
        User owner = TestDataFactory.user(userId, "member@example.com");
        Organization organization = TestDataFactory.organization(
                UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                owner,
                "Core Team",
                "core-team"
        );

        when(memberService.getUserOrganizations(userId)).thenReturn(List.of(organization));
        when(memberService.getUserRole(organization.getId(), userId)).thenReturn(Optional.of(OrganizationRole.ADMIN));
        when(ssoConfigRepository.findByOrganizationId(organization.getId())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/organizations").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(organization.getId().toString()))
                .andExpect(jsonPath("$[0].slug").value("core-team"))
                .andExpect(jsonPath("$[0].current_user_role").value("ADMIN"));
    }

    private record CreateOrgRequest(
            String name,
            String slug,
            String description,
            Boolean require_password,
            String password
    ) {
    }
}
