package tech.nicorp.pm.pipelines.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PipelineYamlParserTest {

    private final PipelineYamlParser parser = new PipelineYamlParser();

    @Test
    void parseBuildsDefaultsJobsAndRules() {
        String yaml = """
                default:
                  image: node:20
                  variables:
                    APP_ENV: test
                    RETRIES: 2
                  before_script:
                    - npm ci
                    - npm run lint
                jobs:
                  build:
                    script:
                      - npm run build
                    rules:
                      - if: '$CI_PIPELINE_SOURCE == "push"'
                        when: on_success
                        allow_failure: false
                  deploy:
                    image: alpine:3.20
                    script: ./deploy.sh
                    rules:
                      - if: '$CI_COMMIT_BRANCH == "main"'
                        when: delayed
                        start_in: 120
                """;

        PipelineYamlParser.PipelineSpec spec = parser.parse(yaml);

        assertThat(spec.defaults.image).isEqualTo("node:20");
        assertThat(spec.defaults.variables)
                .containsEntry("APP_ENV", "test")
                .containsEntry("RETRIES", "2");
        assertThat(spec.defaults.beforeScript)
                .containsExactly("npm ci", "npm run lint");

        assertThat(spec.jobs).hasSize(2);
        assertThat(spec.jobs.get(0).name).isEqualTo("build");
        assertThat(spec.jobs.get(0).script).containsExactly("npm run build");
        assertThat(spec.jobs.get(0).rules)
                .singleElement()
                .satisfies(rule -> {
                    assertThat(rule.expr).isEqualTo("$CI_PIPELINE_SOURCE == \"push\"");
                    assertThat(rule.when).isEqualTo("on_success");
                    assertThat(rule.allowFailure).isFalse();
                });

        assertThat(spec.jobs.get(1).image).isEqualTo("alpine:3.20");
        assertThat(spec.jobs.get(1).script).containsExactly("./deploy.sh");
        assertThat(spec.jobs.get(1).rules)
                .singleElement()
                .satisfies(rule -> {
                    assertThat(rule.when).isEqualTo("delayed");
                    assertThat(rule.startAfterSeconds).isEqualTo(120);
                });
    }

    @Test
    void parseReturnsEmptySpecForBlankYaml() {
        PipelineYamlParser.PipelineSpec spec = parser.parse("   ");

        assertThat(spec.defaults.image).isNull();
        assertThat(spec.defaults.variables).isEmpty();
        assertThat(spec.defaults.beforeScript).isEmpty();
        assertThat(spec.jobs).isEmpty();
    }
}
