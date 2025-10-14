package tech.nicorp.pm.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class IdentityProviderSwaggerConfig {

    @Bean
    public GroupedOpenApi identityProviderApi() {
        return GroupedOpenApi.builder()
                .group("identity-provider")
                .pathsToMatch("/api/identity-provider/**", "/api/organizations/*/identity-provider/**", "/api/organizations/*/corporate-auth/**")
                .build();
    }

    @Bean
    public OpenAPI identityProviderOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("NIGIt Identity Provider API")
                        .version("1.0")
                        .description("API для интеграции с корпоративной системой аутентификации")
                        .contact(new Contact()
                                .name("NIGIt Support")
                                .email("support@nigit.com")))
                .components(new Components()
                        .addSecuritySchemes("ApiKey", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-API-Key"))
                        .addSecuritySchemes("ApiSecret", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-API-Secret")))
                .addSecurityItem(new SecurityRequirement()
                        .addList("ApiKey")
                        .addList("ApiSecret"));
    }
}

