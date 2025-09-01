package tech.nicorp.pm.pipelines.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.pipelines.domain.*;
import tech.nicorp.pm.pipelines.repo.PipelineJobRepository;
import tech.nicorp.pm.pipelines.repo.PipelineRepository;
import tech.nicorp.pm.git.GitService;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;
import java.util.HashMap;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PipelineService {
    private final PipelineRepository pipelineRepository;
    private final PipelineJobRepository jobRepository;
    private final GitService gitService;
    private final PipelineYamlParser yamlParser = new PipelineYamlParser();
    private final ObjectMapper mapper = new ObjectMapper();

    @Transactional
    public Pipeline trigger(Map<String, Object> req) {
        Pipeline pipeline = new Pipeline();
        pipeline.setRepositoryId(UUID.fromString((String) req.get("repository_id")));
        pipeline.setRef((String) req.getOrDefault("ref", "master"));
        pipeline.setCommitSha((String) req.getOrDefault("commit_sha", ""));
        Object source = req.get("source");
        if (source != null) {
            pipeline.setSource(PipelineSource.valueOf(source.toString()));
        }
        pipeline = pipelineRepository.save(pipeline);
        // read YAML from repo
        try {
            String yaml = gitService.fileContent(pipeline.getRepositoryId(), pipeline.getCommitSha().isBlank() ? pipeline.getRef() : pipeline.getCommitSha(), ".pm-ci.yml");
            PipelineYamlParser.PipelineSpec spec = yamlParser.parse(yaml);
            Map<String, String> env = buildCiEnv(pipeline, req);
            String envJson = mapper.writeValueAsString(env);
            for (PipelineYamlParser.JobSpec js : spec.jobs) {
                RuleDecision decision = evaluateRules(js.rules, env);
                if (decision.whenType == WhenType.NEVER) continue;
                PipelineJob job = new PipelineJob();
                job.setPipeline(pipeline);
                job.setName(js.name);
                job.setImage(js.image != null ? js.image : spec.defaults.image);
                // prepend before_script
                String fullScript = String.join("\n", spec.defaults.beforeScript) +
                        (spec.defaults.beforeScript.isEmpty() ? "" : "\n") + String.join("\n", js.script);
                job.setScript(fullScript);
                job.setEnvJson(envJson);
                job.setWhenType(decision.whenType);
                job.setManual(decision.whenType == WhenType.MANUAL);
                job.setAllowFailure(decision.allowFailure != null && decision.allowFailure);
                job.setStartAfterSeconds(decision.startAfterSeconds);
                job.setRuleHint(decision.ruleHint);
                jobRepository.save(job);
            }
        } catch (Exception ignored) {}
        return pipeline;
    }

    private Map<String, String> buildCiEnv(Pipeline pipeline, Map<String, Object> req) {
        Map<String, String> env = new HashMap<>();
        env.put("CI_PIPELINE_SOURCE", pipeline.getSource().name().toLowerCase());
        env.put("CI_COMMIT_BRANCH", pipeline.getRef());
        env.put("CI_COMMIT_SHA", pipeline.getCommitSha());
        env.put("CI_REPO_ID", pipeline.getRepositoryId().toString());
        env.put("CI_PIPELINE_ID", pipeline.getId().toString());
        String changed = String.valueOf(req.getOrDefault("changed_paths", ""));
        env.put("CI_CHANGED_PATHS", changed);
        return env;
    }

    private record RuleDecision(WhenType whenType, Integer startAfterSeconds, Boolean allowFailure, String ruleHint) {}

    private RuleDecision evaluateRules(List<PipelineYamlParser.RuleSpec> rules, Map<String, String> env) {
        if (rules == null || rules.isEmpty()) {
            return new RuleDecision(WhenType.ON_SUCCESS, null, null, null);
        }
        for (PipelineYamlParser.RuleSpec r : rules) {
            boolean match = r.expr == null || evaluateExpr(r.expr, env);
            if (match) {
                WhenType when = WhenType.ON_SUCCESS;
                if (r.when != null) {
                    switch (r.when.toLowerCase()) {
                        case "manual" -> when = WhenType.MANUAL;
                        case "delayed" -> when = WhenType.DELAYED;
                        case "never" -> when = WhenType.NEVER;
                        case "on_failure" -> when = WhenType.ON_FAILURE;
                        default -> when = WhenType.ON_SUCCESS;
                    }
                }
                return new RuleDecision(when, r.startAfterSeconds, r.allowFailure, r.expr);
            }
        }
        return new RuleDecision(WhenType.NEVER, null, null, null);
    }

    private boolean evaluateExpr(String expr, Map<String, String> env) {
        expr = expr.trim();
        // support ==, =~, !~ on simple variables
        String[] ops = new String[] {"==", "=~", "!~"};
        for (String op : ops) {
            int idx = expr.indexOf(op);
            if (idx > 0) {
                String left = expr.substring(0, idx).trim();
                String right = expr.substring(idx + op.length()).trim();
                right = trimQuotes(right);
                String val = env.get(stripVar(left));
                if (val == null) val = "";
                return switch (op) {
                    case "==" -> val.equals(right);
                    case "=~" -> Pattern.compile(right).matcher(val).find();
                    case "!~" -> !Pattern.compile(right).matcher(val).find();
                    default -> false;
                };
            }
        }
        // contains check for CI_CHANGED_PATHS simple substring
        if (expr.startsWith("$CI_CHANGED_PATHS")) {
            String[] parts = expr.split("\\s+~=\\s+");
            if (parts.length == 2) {
                String regex = trimQuotes(parts[1]);
                return Pattern.compile(regex).matcher(env.getOrDefault("CI_CHANGED_PATHS", "")).find();
            }
        }
        // fallback: true if var is non-empty
        String var = stripVar(expr);
        return env.getOrDefault(var, "").length() > 0;
    }

    private String stripVar(String s) {
        s = s.trim();
        if (s.startsWith("$")) s = s.substring(1);
        return s;
    }

    private String trimQuotes(String s) {
        if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'"))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }

    @Transactional
    public void cancel(UUID pipelineId) {
        pipelineRepository.findById(pipelineId).ifPresent(p -> {
            p.setStatus(PipelineStatus.CANCELED);
            for (PipelineJob j : p.getJobs()) {
                if (j.getStatus() == JobStatus.QUEUED || j.getStatus() == JobStatus.RUNNING) {
                    j.setStatus(JobStatus.CANCELED);
                    j.setFinishedAt(java.time.OffsetDateTime.now());
                }
            }
            pipelineRepository.save(p);
        });
    }

    @Transactional
    public PipelineJob releaseManual(UUID jobId) {
        PipelineJob job = jobRepository.findById(jobId).orElseThrow();
        job.setManualReleased(true);
        jobRepository.save(job);
        return job;
    }
}


