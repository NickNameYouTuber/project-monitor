from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas
from ..models import Repository, RepositoryMember, User, Task, Comment
from ..auth import get_current_active_user
import os
import git
from pathlib import Path
import base64
import pygit2
from datetime import datetime
from pydantic import BaseModel
import uuid
import re
from ..services.pipeline_manager import trigger_pipeline
from ..models.pipeline import PipelineSource

class CommitNotification(BaseModel):
    repository_id: str
    branch: str
    commit_hash: str
    short_hash: Optional[str] = None
    message: str
    author: str
    date: str

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
    # Преобразуем repository_id в строку, чтобы избежать проблем с UUID
    return Path(REPOS_BASE_DIR) / str(repository_id)


@router.get("/{repository_id}/files", response_model=List[schemas.GitFile])
async def list_files(
    repository_id: str,
    path: str = "",
    branch: Optional[str] = None,
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
        
        # Используем запрошенную ветку или берем активную (дефолтную)
        branch_name = branch
        
        if not branch_name:
            # Если ветка не указана, используем активную ветку
            branch_name = repo.active_branch.name
        elif branch_name not in [h.name for h in repo.heads]:
            # Если указанная ветка не существует
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Branch '{branch_name}' not found"
            )
        
        # Get the tree at the given path
        tree = repo.heads[branch_name].commit.tree
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
                        "hash": str(repo.git.log("-1", "--format=%H", "--", item.path)),
                        "message": str(repo.git.log("-1", "--format=%s", "--", item.path)),
                        "date": datetime.fromtimestamp(
                            int(repo.git.log("-1", "--format=%at", "--", item.path))
                        ).isoformat(),
                        "author": str(repo.git.log("-1", "--format=%an", "--", item.path))
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
    branch: Optional[str] = None,
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
        
        # Используем запрошенную ветку или берем активную (дефолтную)
        branch_name = branch
        
        if not branch_name:
            # Если ветка не указана, используем активную ветку
            branch_name = repo.active_branch.name
        elif branch_name not in [h.name for h in repo.heads]:
            # Если указанная ветка не существует
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Branch '{branch_name}' not found"
            )
        
        # Try to get file from git
        try:
            # Сначала пробуем получить содержимое как текст
            try:
                file_content = repo.git.show(f"{branch_name}:{file_path}")
                
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
                git_cmd = ['git', 'show', f"{branch_name}:{file_path}"]
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


@router.get("/{repository_id}/branches", response_model=List[schemas.GitBranch])
async def list_branches(
    repository_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of branches in repository
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
        
        # Определяем имя ветки по умолчанию (может быть master, main или другая)
        default_branch_name = None
        try:
            # Попытка получить имя ветки из конфигурации
            default_branch_name = repo.git.config('--get', 'init.defaultBranch')
        except git.GitCommandError:
            pass
            
        # Если не удалось получить из конфигурации, проверяем наличие стандартных веток
        if not default_branch_name:
            for branch_name in ['main', 'master']:
                if branch_name in repo.heads:
                    default_branch_name = branch_name
                    break
        
        # Если и это не сработало, берем активную ветку
        if not default_branch_name and repo.active_branch:
            default_branch_name = repo.active_branch.name
        
        # Список веток
        branches = []
        for branch in repo.heads:
            # Получаем последний коммит ветки
            last_commit = list(repo.iter_commits(branch.name, max_count=1))[0] if branch.commit else None
            
            branch_info = {
                "name": branch.name,
                "commit_hash": str(branch.commit.hexsha) if branch.commit else None,
                "is_default": branch.name == default_branch_name,
            }
            
            # Если есть последний коммит, добавляем его данные
            if last_commit:
                branch_info["last_commit_date"] = datetime.fromtimestamp(last_commit.committed_date).isoformat()
                branch_info["last_commit_message"] = last_commit.message
                
            branches.append(branch_info)
        
        # Сортируем ветки - сначала дефолтная, потом по алфавиту
        branches.sort(key=lambda x: (0 if x["is_default"] else 1, x["name"]))
        return branches
        
    except git.GitCommandError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                           detail=f"Git command error: {str(e)}")
    except Exception as e:
        print(f"Error listing branches: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                           detail=f"Error listing branches: {str(e)}")


class CreateBranchRequest(BaseModel):
    name: str
    base_branch: Optional[str] = None
    task_id: Optional[str] = None

@router.post("/{repository_id}/branches")
async def create_branch(
    repository_id: str,
    request: CreateBranchRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new branch in the repository
    """
    try:
        repository = check_repository_access(repository_id, str(current_user.id), db)
        repo_path = get_repo_path(repository_id)
        
        if not repo_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Repository directory not found"
            )
            
        # Initialize git repository
        repo = git.Repo(repo_path)
        
        # Check if the repository has any commits (is empty)
        if len(repo.heads) == 0 or len(list(repo.iter_commits())) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Repository is empty, cannot create branch"
            )
        
        # Validate that the branch doesn't already exist
        if request.name in [head.name for head in repo.heads]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Branch '{request.name}' already exists"
            )
        
        # Determine base branch
        base_branch = request.base_branch
        if not base_branch:
            # Use default branch if none specified
            try:
                base_branch = repo.git.config('--get', 'init.defaultBranch')
            except git.GitCommandError:
                pass
            
            if not base_branch or base_branch not in repo.heads:
                for branch_name in ['main', 'master']:
                    if branch_name in repo.heads:
                        base_branch = branch_name
                        break
            
            if not base_branch or base_branch not in repo.heads:
                if len(repo.heads) > 0:
                    base_branch = repo.heads[0].name
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No base branch available"
                    )
        
        # Create the new branch
        try:
            repo.git.branch(request.name, base_branch)
            
            # If task_id is provided, create a system comment
            if request.task_id:
                task = db.query(Task).filter(Task.id == request.task_id).first()
                if task:
                    # Create system comment
                    comment = Comment(
                        id=str(uuid.uuid4()),
                        task_id=request.task_id,
                        user_id=current_user.id,
                        content=f"🔄 Created branch **{request.name}** from {base_branch}",
                        is_system=True
                    )
                    db.add(comment)
                    db.commit()
            
            return {
                "name": request.name,
                "base_branch": base_branch,
                "success": True
            }
                
        except git.GitCommandError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create branch: {str(e)}"
            )
            
    except Exception as e:
        print(f"Error creating branch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating branch: {str(e)}"
        )

@router.get("/{repository_id}/commits", response_model=List[schemas.GitCommit])
async def list_commits(
    repository_id: str,
    path: Optional[str] = None,
    branch: Optional[str] = None,
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
            
        # Prepare git log command (newest first by default)
        git_log_cmd = ["--pretty=format:%H|%an|%ae|%at|%s", f"-{limit}", f"--skip={skip}"]
        
        # Если указана ветка, добавим её в команду
        if branch:
            git_log_cmd.insert(0, branch)
        
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
            if len(parts) == 5:
                commit_hash, author_name, author_email, author_time, subject = parts
                
                # Get stats for the commit using git show (against parent)
                parent = repo.commit(commit_hash).parents[0] if repo.commit(commit_hash).parents else None
                stats_output = repo.git.show(commit_hash, "--stat", "--format=", parent.hexsha if parent else None).strip() if parent else repo.git.show(commit_hash, "--stat", "--format=").strip()
                stats = {}
                
                # Parse the stats output
                if stats_output:
                    lines = stats_output.split('\n')
                    files_changed = len([l for l in lines if ' | ' in l])
                    
                    # Try to get the insertion/deletion counts
                    summary_line = lines[-1] if lines else ""
                    insertions = 0
                    deletions = 0
                    
                    if "insertion" in summary_line:
                        try:
                            insertions_part = summary_line.split("insertion")[0]
                            insertions = int(insertions_part.split(",")[-1].strip())
                        except:
                            pass
                    
                    if "deletion" in summary_line:
                        try:
                            if "insertion" in summary_line:
                                deletions_part = summary_line.split("insertion")[1].split("deletion")[0]
                            else:
                                deletions_part = summary_line.split("deletion")[0]
                            deletions = int(deletions_part.split(",")[-1].strip())
                        except:
                            pass
                    
                    stats = {
                        "files_changed": files_changed,
                        "insertions": insertions,
                        "deletions": deletions
                    }
                
                commit = {
                    "hash": commit_hash,
                    "short_hash": commit_hash[:8],
                    "author": author_name,
                    "author_email": author_email,
                    "message": subject,
                    "date": datetime.fromtimestamp(int(author_time)).isoformat(),
                    "stats": stats
                }
                commits.append(commit)
                
        return commits
        
    except git.GitCommandError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Git command error: {str(e)}")
                          
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                          detail=f"Error fetching commits: {str(e)}")

@router.post("/webhook/commit")
async def process_commit_notification(
    commit_data: CommitNotification,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обработка уведомления о новом коммите и создание системного комментария в связанной задаче"""
    
    try:
        # Проверяем доступ к репозиторию
        repo = db.query(Repository).filter(Repository.id == commit_data.repository_id).first()
        if not repo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
        
        # Находим задачи, у которых есть комментарии с информацией о ветке
        branch_comments = db.query(Comment).filter(
            Comment.is_system == True,
            (Comment.content.like(f"%**{commit_data.branch}**%") | 
             Comment.content.like(f"%{commit_data.branch} from%") | 
             Comment.content.like(f"%Привязана ветка {commit_data.branch}%"))
        ).all()
        
        # Получаем ID задач из найденных комментариев
        task_ids = set(comment.task_id for comment in branch_comments)
        tasks_with_branch = db.query(Task).filter(Task.id.in_(task_ids)).all()
        
        # Если нашлись задачи, связанные с этой веткой
        if tasks_with_branch:
            short_hash = commit_data.short_hash or (commit_data.commit_hash[:8] if commit_data.commit_hash else "")
            
            # Для каждой задачи создаем системный комментарий о коммите
            for task in tasks_with_branch:
                comment = Comment(
                    id=str(uuid.uuid4()),
                    task_id=task.id,
                    user_id=current_user.id,
                    content=f"💻 Новый коммит в ветке **{commit_data.branch}**\n\n**{short_hash}**: {commit_data.message}\n\nАвтор: {commit_data.author} • {commit_data.date}",
                    is_system=True
                )
                db.add(comment)
            
            db.commit()
            return {"status": "success", "tasks_updated": len(tasks_with_branch)}
        
        return {"status": "success", "tasks_updated": 0, "message": "No tasks associated with this branch"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process commit notification: {str(e)}"
        )
        
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
            
            parent = commit.parents[0] if commit.parents else None
            if parent is None:
                # Root commit: return all files as added with content lines
                def walk_tree(tree, base_path=""):
                    files = []
                    for item in tree:
                        if isinstance(item, git.Tree):
                            files.extend(walk_tree(item, os.path.join(base_path, item.name)))
                        else:
                            path = os.path.join(base_path, item.name) if base_path else item.name
                            try:
                                data = item.data_stream.read()
                                text = data.decode('utf-8', errors='replace')
                            except Exception:
                                text = ""
                            additions = sum(1 for line in text.splitlines())
                            files.append({
                                "path": path,
                                "old_path": None,
                                "change_type": "added",
                                "additions": additions,
                                "deletions": 0,
                                "diff": "\n".join(["+" + l for l in text.splitlines()])
                            })
                    return files
                commit_info["files"] = walk_tree(commit.tree)
                return commit_info
            
            # Non-root: diff parent -> commit
            diffs = parent.diff(commit, create_patch=True)
            for diff_item in diffs:
                change_type = "unknown"
                
                if diff_item.new_file:
                    change_type = "added"
                elif diff_item.deleted_file:
                    change_type = "deleted"
                elif diff_item.renamed:
                    change_type = "renamed"
                else:
                    change_type = "modified"
                    
                # Ensure we get textual patch
                raw = diff_item.diff
                diff_text = raw.decode('utf-8', errors='replace') if isinstance(raw, (bytes, bytearray)) else str(raw or "")

                # Rough counts: number of lines starting with '+'/'-' excluding headers
                additions = sum(1 for line in diff_text.splitlines() if line.startswith('+') and not line.startswith('+++'))
                deletions = sum(1 for line in diff_text.splitlines() if line.startswith('-') and not line.startswith('---'))

                b_path = getattr(diff_item, 'b_path', None)
                a_path = getattr(diff_item, 'a_path', None)
                file_info = {
                    "path": b_path or a_path,
                    "old_path": a_path if a_path and a_path != b_path else None,
                    "change_type": change_type,
                    "additions": additions,
                    "deletions": deletions,
                    "diff": diff_text
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
