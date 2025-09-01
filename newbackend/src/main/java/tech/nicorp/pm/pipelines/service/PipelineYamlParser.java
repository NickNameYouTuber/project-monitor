package tech.nicorp.pm.pipelines.service;

import org.yaml.snakeyaml.Yaml;

import java.util.*;

public class PipelineYamlParser {

    public static class DefaultSpec {
        public String image;
        public Map<String, String> variables = new HashMap<>();
        public List<String> beforeScript = new ArrayList<>();
    }

    public static class RuleSpec {
        public String expr; // e.g. $CI_PIPELINE_SOURCE == "push"
        public String when; // on_success|manual|delayed|never
        public Integer startAfterSeconds; // for delayed
        public Boolean allowFailure;
    }

    public static class JobSpec {
        public String name;
        public String image;
        public List<String> script = new ArrayList<>();
        public List<RuleSpec> rules = new ArrayList<>();
    }

    public static class PipelineSpec {
        public DefaultSpec defaults = new DefaultSpec();
        public List<JobSpec> jobs = new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    public PipelineSpec parse(String yamlText) {
        PipelineSpec spec = new PipelineSpec();
        if (yamlText == null || yamlText.isBlank()) return spec;
        Object rootObj = new Yaml().load(yamlText);
        if (!(rootObj instanceof Map<?, ?> root)) return spec;

        Object def = root.get("default");
        if (def instanceof Map<?, ?> dm) {
            Object img = dm.get("image");
            if (img != null) spec.defaults.image = String.valueOf(img);
            Object vars = dm.get("variables");
            if (vars instanceof Map<?, ?> vm) {
                vm.forEach((k, v) -> spec.defaults.variables.put(String.valueOf(k), String.valueOf(v)));
            }
            Object bs = dm.get("before_script");
            if (bs instanceof List<?> ls) {
                for (Object line : ls) spec.defaults.beforeScript.add(String.valueOf(line));
            } else if (bs instanceof String s) {
                spec.defaults.beforeScript.add(s);
            }
        }

        Object jobsObj = root.get("jobs");
        if (jobsObj instanceof Map<?, ?> jobs) {
            for (Map.Entry<?, ?> e : jobs.entrySet()) {
                String name = String.valueOf(e.getKey());
                Object jobObj = e.getValue();
                if (!(jobObj instanceof Map<?, ?> jobMap)) continue;
                JobSpec js = new JobSpec();
                js.name = name;
                Object img = jobMap.get("image");
                if (img != null) js.image = String.valueOf(img);
                Object script = jobMap.get("script");
                if (script instanceof List<?> ls) {
                    for (Object line : ls) js.script.add(String.valueOf(line));
                } else if (script instanceof String s) {
                    js.script.add(s);
                }
                Object rules = jobMap.get("rules");
                if (rules instanceof List<?> rl) {
                    for (Object ro : rl) {
                        if (ro instanceof Map<?, ?> rm) {
                            RuleSpec rs = new RuleSpec();
                            Object ifExpr = rm.get("if");
                            Object when = rm.get("when");
                            Object startIn = rm.get("start_in");
                            Object allow = rm.get("allow_failure");
                            if (ifExpr != null) rs.expr = String.valueOf(ifExpr);
                            if (when != null) rs.when = String.valueOf(when);
                            if (startIn instanceof Number n) rs.startAfterSeconds = n.intValue();
                            if (allow instanceof Boolean b) rs.allowFailure = b;
                            js.rules.add(rs);
                        }
                    }
                }
                spec.jobs.add(js);
            }
        }
        return spec;
    }
}


