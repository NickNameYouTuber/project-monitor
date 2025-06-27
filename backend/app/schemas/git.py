from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Union
from datetime import datetime


class GitAuthor(BaseModel):
    name: str
    email: str


class GitCommitStats(BaseModel):
    files_changed: int
    insertions: int
    deletions: int


class GitCommitShort(BaseModel):
    hash: str
    message: str
    date: str
    author: str


class GitFile(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"
    size: Optional[int] = None
    last_commit: Optional[GitCommitShort] = None


class GitCommit(BaseModel):
    hash: str
    author: Union[GitAuthor, str]  # Может быть либо объектом GitAuthor, либо строкой
    message: str
    date: str
    stats: GitCommitStats


class GitContent(BaseModel):
    name: str
    path: str
    content: str
    encoding: str  # utf-8 or base64
    size: int
    binary: bool


class GitCloneInfo(BaseModel):
    """Information needed for cloning a repository"""
    ssh_url: str
    https_url: str
    web_url: str
    clone_instructions: Dict[str, str]  # Different instructions for different methods


class GitFileChange(BaseModel):
    path: str
    old_path: Optional[str] = None
    change_type: str  # added, modified, deleted, renamed
    additions: int
    deletions: int
    diff: str


class GitCommitDetail(BaseModel):
    hash: str
    author: Union[GitAuthor, str]  # Может быть либо объектом GitAuthor, либо строкой
    committer: Union[GitAuthor, str]  # Может быть либо объектом GitAuthor, либо строкой
    message: str
    date: str
    parent_hashes: List[str]
    files: List[GitFileChange]


# GitFile is defined above


# GitContent is defined above
