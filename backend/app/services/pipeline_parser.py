from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
import yaml


class ParsedPipeline:
    def __init__(self, stages: List[str], jobs: List[Dict[str, Any]], variables: Dict[str, str], defaults: Dict[str, Any]):
        self.stages = stages
        self.jobs = jobs
        self.variables = variables
        self.defaults = defaults


def parse_pipeline_yaml(content: str) -> ParsedPipeline:
    data = yaml.safe_load(content) or {}
    stages = data.get("stages") or []
    variables = data.get("variables") or {}
    defaults = data.get("default") or {}
    jobs: List[Dict[str, Any]] = []

    jobs_section = data.get("jobs") or {}
    if isinstance(jobs_section, dict):
        for name, cfg in jobs_section.items():
            if not isinstance(cfg, dict):
                continue
            job = {
                "name": name,
                "stage": cfg.get("stage"),
                "image": cfg.get("image") or defaults.get("image") or "alpine:3",
                "script": cfg.get("script") or [],
                "needs": cfg.get("needs") or [],
                "env": {**(defaults.get("variables") or {}), **(cfg.get("env") or variables or {})},
                "artifacts": (cfg.get("artifacts") or {}).get("paths", []),
                "only": cfg.get("only") or [],
                "except": cfg.get("except") or [],
                "retry": cfg.get("retry"),
                "timeout": cfg.get("timeout"),
                "rules": cfg.get("rules") or [],
                "before_script": cfg.get("before_script") or defaults.get("before_script") or [],
            }
            # normalize script to list
            if isinstance(job["script"], str):
                job["script"] = [job["script"]]
            jobs.append(job)

    return ParsedPipeline(stages=stages, jobs=jobs, variables=variables, defaults=defaults)


