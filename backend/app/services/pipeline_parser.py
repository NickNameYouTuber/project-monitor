from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
import yaml


class ParsedPipeline:
    def __init__(self, stages: List[str], jobs: List[Dict[str, Any]], variables: Dict[str, str]):
        self.stages = stages
        self.jobs = jobs
        self.variables = variables


def parse_pipeline_yaml(content: str) -> ParsedPipeline:
    data = yaml.safe_load(content) or {}
    stages = data.get("stages") or []
    variables = data.get("variables") or {}
    jobs: List[Dict[str, Any]] = []

    jobs_section = data.get("jobs") or {}
    if isinstance(jobs_section, dict):
        for name, cfg in jobs_section.items():
            if not isinstance(cfg, dict):
                continue
            job = {
                "name": name,
                "stage": cfg.get("stage"),
                "image": cfg.get("image") or "alpine:3",
                "script": cfg.get("script") or [],
                "needs": cfg.get("needs") or [],
                "env": cfg.get("env") or variables or {},
                "artifacts": (cfg.get("artifacts") or {}).get("paths", []),
                "only": cfg.get("only") or [],
                "except": cfg.get("except") or [],
            }
            # normalize script to list
            if isinstance(job["script"], str):
                job["script"] = [job["script"]]
            jobs.append(job)

    return ParsedPipeline(stages=stages, jobs=jobs, variables=variables)


