from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas
from ..models import Repository, RepositoryMember, User
from ..auth import get_current_active_user
import os
import git
from pathlib import Path
import base64
import pygit2
from datetime import datetime

router = APIRouter()

# Base directory where git repositories are stored
REPOS_BASE_DIR = os.environ.get("GIT_REPOS_DIR", "/app/git_repos")


def check_repository_access(repository_id: str, user_id: str, db: Session):
    """Check if user has access to the repository"""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    
    if not repository:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    
    # Check if user is owner or member
    has_access = (str(repository.owner_id) == user_id) or \
                 db.query(RepositoryMember).filter(
                     RepositoryMember.repository_id == repository_id,
                     RepositoryMember.user_id == user_id,
                     RepositoryMember.is_active == True
                 ).first() is not None
    
    if not has_access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                           detail="Not authorized to access this repository")
    
    return repository


def get_repo_path(repository_id: str) -> Path:
    """Get file path to the git repository"""
    return Path(REPOS_BASE_DIR) / repository_id


@router.get("/{repository_id}/files", response_model=List[schemas.GitFile])
async def list_files(
    repository_id: str,
    path: str = "",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of files in repository or specified directory
    """
    try:
        repository = check_repository_access(repository_id, str(current_user.id), db)
        repo_path = get_repo_path(repository_id)
        
        if not repo_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                               detail="Repository directory not found")
            
        # Initialize git repository
        repo = git.Repo(repo_path)
        
        # Check if the repository has any commits (is empty)
        if len(repo.heads) == 0 or len(list(repo.iter_commits())) == 0:
            # Repository is empty, return empty list (not an error)
            return []
        
        # Get the default branch
        branch = repo.active_branch
        
        # Get the tree at the given path
        tree = repo.heads[branch.name].commit.tree
        if path:
            for part in path.split('/'):
                if part:
                    try:
                        tree = tree[part]
                    except KeyError:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                           detail=f"Path {path} not found")
        
        # List files and directories
        result = []
        
        if isinstance(tree, git.Tree):
            for item in tree:
                is_dir = isinstance(item, git.Tree)
                
                file_info = {
                    "name": item.name,
                    "path": os.path.join(path, item.name) if path else item.name,
                    "type": "directory" if is_dir else "file",
                    "size": item.size if not is_dir else None,
                    "last_commit": {
                        "hash": str(repo.git.log("-1", "--format=%H", item.path)),
                        "message": str(repo.git.log("-1", "--format=%s", item.path)),
                        "date": datetime.fromtimestamp(
                            int(repo.git.log("-1", "--format=%at", item.path))
                        ).isoformat(),
                        "author": str(repo.git.log("-1", "--format=%an", item.path))
                    }
                }
                result.append(file_info)
                
        return result
        
    except git.GitCommandError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                           detail=f"Git command error: {str(e)}")
    except Exception as e:
        print(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                           detail=f"Error listing files: {str(e)}")


@router.get("/{repository_id}/content/{file_path:path}", response_model=schemas.GitContent)
async def get_file_content(
    repository_id: str,
    file_path: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get content of a file in the repository
    """
    try:
        repository = check_repository_access(repository_id, str(current_user.id), db)
        repo_path = get_repo_path(repository_id)
        
        if not repo_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                               detail="Repository directory not found")
        
        # Initialize git repository
        repo = git.Repo(repo_path)
        
        # Check if the repository has any commits (is empty)
        if len(repo.heads) == 0 or len(list(repo.iter_commits())) == 0:
            # Repository is empty, return a friendly message
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This repository is empty. Add some files to view content."
            )
        
        # Get the default branch
        branch = repo.active_branch
        
        # Try to get file from git
        try:
            # Сначала пробуем получить содержимое как текст
            try:
                file_content = repo.git.show(f"{branch.name}:{file_path}")
                
                # Определяем тип файла по расширению и содержимому
                # Будем считать текстовыми файлы с определенными расширениями + файлы без null-байтов
                file_extension = os.path.splitext(file_path)[1].lower()
                
                # Список расширений, которые точно являются текстовыми файлами, даже с эмодзи
                text_extensions = {
                    '.md', '.markdown', '.txt', '.json', '.yml', '.yaml', '.css', '.scss', '.less',
                    '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.xml', '.svg', '.py', '.rb',
                    '.java', '.c', '.cpp', '.h', '.cs', '.go', '.php', '.sh', '.bash', '.zsh',
                    '.bat', '.ps1', '.sql', '.ini', '.conf', '.cfg', '.toml', '.rst', '.tex',
                    '.gitignore', '.env', '.editorconfig', 'dockerfile', '.htaccess'
                }
                
                # Если у файла известное текстовое расширение, сразу считаем его текстовым
                if file_extension in text_extensions:
                    is_binary = False
                else:
                    # Для файлов с неизвестными расширениями используем только проверку на null-байты
                    is_binary = False
                    try:
                        # Проверка только на null-байты - самый надежный способ определить бинарные файлы
                        # Эмодзи и другие Unicode-символы не содержат null-байты
                        if b'\0' in file_content.encode('utf-8', errors='ignore'):
                            is_binary = True
                    except Exception:
                        # Если произошла ошибка при кодировании, не считаем файл бинарным автоматически
                        # Для MD файлов мы уже решили, что они текстовые
                        print(f"Unicode encoding error but file might still be text: {str(file_path)}")
                        # Для маркдаунов и текста не считаем файл бинарным по умолчанию
                        pass
                    
                if not is_binary:
                    # Возвращаем текстовое содержимое
                    return {
                        "name": os.path.basename(file_path),
                        "path": file_path,
                        "content": file_content,
                        "encoding": "utf-8",
                        "size": len(file_content),
                        "binary": False
                    }
            except Exception as e:
                print(f"Error getting file as text: {str(e)}")
                pass  # Если не удалось получить как текст, попробуем как бинарный
            
            # Получаем бинарное содержимое
            try:
                # Используем git.execute без GitPython для получения сырых байтов
                git_cmd = ['git', 'show', f"{branch.name}:{file_path}"]
                import subprocess
                result = subprocess.run(
                    git_cmd,
                    cwd=str(repo_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    check=True
                )
                binary_content = result.stdout
                
                # Кодируем в base64
                encoded_content = base64.b64encode(binary_content).decode('ascii')
                
                return {
                    "name": os.path.basename(file_path),
                    "path": file_path,
                    "content": encoded_content,
                    "encoding": "base64",
                    "size": len(binary_content),
                    "binary": True
                }
            except subprocess.CalledProcessError as e:
                print(f"Subprocess error: {e.stderr.decode() if e.stderr else str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error accessing file: {e.stderr.decode() if e.stderr else str(e)}"
                )
                
        except git.GitCommandError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                               detail=f"File not found or cannot be displayed: {str(e)}")
            
    except Exception as e:
        print(f"Error getting file content: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                           detail=f"Error getting file content: {str(e)}")


@router.get("/{repository_id}/commits", response_model=List[schemas.GitCommit])
async def list_commits(
    repository_id: str,
    path: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get commit history for repository or specific file/directory
    """
    try:
        repository = check_repository_access(repository_id, str(current_user.id), db)
        repo_path = get_repo_path(repository_id)
        
        if not repo_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                               detail="Repository directory not found")
            
        # Initialize git repository
        repo = git.Repo(repo_path)
        
        # Check if the repository has any commits (is empty)
        if len(repo.heads) == 0 or len(list(repo.iter_commits())) == 0:
            # Repository is empty, return empty list (not an error)
            return []
            
        # Prepare git log command
        git_log_cmd = ["--pretty=format:%H|%an|%ae|%at|%s", f"-{limit}", f"--skip={skip}"]
        
        if path:
            git_log_cmd.append("--")
            git_log_cmd.append(path)
            
        # Execute git log command
        logs = repo.git.log(*git_log_cmd).split('\n')
        
        # Parse results
        commits = []
        for log in logs:
            if not log.strip():
                continue
                
            parts = log.split('|')
            if len(parts) >= 5:
                commit_hash, author_name, author_email, author_time, subject = parts
                
                # Get stats (files changed, insertions, deletions)
                stats = repo.git.show("--stat", "--oneline", commit_hash).split('\n')
                stats_line = stats[-2] if len(stats) >= 2 else ""
                
                files_changed = 0
                insertions = 0
                deletions = 0
                
                if stats_line:
                    stats_parts = stats_line.split(',')
                    for part in stats_parts:
                        if "file" in part:
                            files_changed = int(part.strip().split()[0])
                        elif "insertion" in part:
                            insertions = int(part.strip().split()[0])
                        elif "deletion" in part:
                            deletions = int(part.strip().split()[0])
                
                # Create commit object
                commit = {
                    "hash": commit_hash,
                    "author": author_name,  # Используем только имя автора как строку
                    "message": subject,
                    "date": datetime.fromtimestamp(int(author_time)).isoformat(),
                    "stats": {
                        "files_changed": files_changed,
                        "insertions": insertions,
                        "deletions": deletions
                    }
                }
                commits.append(commit)
                
        return commits
        
    except git.GitCommandError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Git command error: {str(e)}")
    except Exception as e:
        print(f"Error listing commits: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Error listing commits: {str(e)}")


@router.get("/{repository_id}/commits/{commit_hash}", response_model=schemas.GitCommitDetail)
async def get_commit_detail(
    repository_id: str,
    commit_hash: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific commit
    """
    try:
        repository = check_repository_access(repository_id, str(current_user.id), db)
        repo_path = get_repo_path(repository_id)
        
        if not repo_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                               detail="Repository directory not found")
            
        # Initialize git repository
        repo = git.Repo(repo_path)
        
        try:
            # Get commit object
            commit = repo.commit(commit_hash)
            
            # Get commit details
            commit_info = {
                "hash": commit.hexsha,
                "author": commit.author.name,  # Используем только имя автора как строку
                "committer": commit.committer.name,  # Используем только имя коммиттера как строку
                "message": commit.message,
                "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
                "parent_hashes": [parent.hexsha for parent in commit.parents],
                "files": []
            }
            
            # Get file changes
            for diff_item in commit.diff(commit.parents[0] if commit.parents else git.NULL_TREE):
                change_type = "unknown"
                
                if diff_item.new_file:
                    change_type = "added"
                elif diff_item.deleted_file:
                    change_type = "deleted"
                elif diff_item.renamed:
                    change_type = "renamed"
                else:
                    change_type = "modified"
                    
                file_info = {
                    "path": diff_item.b_path if hasattr(diff_item, 'b_path') else diff_item.a_path,
                    "old_path": diff_item.a_path if diff_item.a_path != diff_item.b_path else None,
                    "change_type": change_type,
                    "additions": diff_item.diff.count(b'+') - 1 if hasattr(diff_item, 'diff') else 0,
                    "deletions": diff_item.diff.count(b'-') - 1 if hasattr(diff_item, 'diff') else 0,
                    "diff": diff_item.diff.decode('utf-8', errors='replace') if hasattr(diff_item, 'diff') else ""
                }
                
                commit_info["files"].append(file_info)
                
            return commit_info
            
        except (git.GitCommandError, ValueError) as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                              detail=f"Commit not found: {str(e)}")
            
    except Exception as e:
        print(f"Error getting commit details: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Error getting commit details: {str(e)}")
