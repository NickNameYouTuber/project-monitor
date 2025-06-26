import os
import subprocess
import shutil
from pathlib import Path
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from ..database import get_db
from ..models import Repository, RepositoryMember, User
from ..auth import get_current_user_optional

# Get repos base directory from environment (same as in repository_content.py)
REPOS_BASE_DIR = os.environ.get("GIT_REPOS_DIR", "/app/git_repos")

router = APIRouter()


def get_repo_path(repository_id: str) -> Path:
    """Get file path to the git repository"""
    return Path(REPOS_BASE_DIR) / repository_id


def check_repository_access(repository_id: str, user_id: str = None, db: Session = None):
    """Check if user has access to repository."""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    
    if not repository:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    
    # If repository is public, allow access
    if repository.visibility == "public":
        return repository
    
    # If no user is logged in (anonymous), deny access
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access this repository"
        )
    
    # Check if user is owner
    if str(repository.owner_id) == user_id:
        return repository
    
    # Check if user is a member with access
    member = db.query(RepositoryMember).filter(
        RepositoryMember.repository_id == repository_id,
        RepositoryMember.user_id == user_id,
        RepositoryMember.is_active == True
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )
        
    return repository


# Git HTTP protocol endpoint for advertising refs
@router.get("/{repository_id}.git/info/refs")
async def get_info_refs(
    repository_id: str,
    service: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Git HTTP protocol endpoint for advertising references (refs/heads/*, refs/tags/*)
    This endpoint is called when a client does git clone, git fetch, git pull
    """
    # Check if repository exists and user has access
    try:
        user_id = str(current_user.id) if current_user else None
        repository = check_repository_access(repository_id, user_id, db)
    except HTTPException as e:
        return PlainTextResponse(
            content=f"# Repository not found or you don't have access: {e.detail}",
            status_code=e.status_code
        )
    
    # Validate service parameter
    allowed_services = ['git-upload-pack', 'git-receive-pack']
    if service not in allowed_services:
        return PlainTextResponse(
            content=f"# Invalid service: {service}",
            status_code=400
        )
    
    # Get repository path
    repo_path = get_repo_path(repository_id)
    print(f"Checking Git repository at {repo_path}")
    
    # Check if it's a Git repository
    is_git_repo = False
    
    # First check if the directory exists
    if not repo_path.exists():
        print(f"Repository directory does not exist: {repo_path}")
        try:
            # Create the directory
            repo_path.mkdir(parents=True, exist_ok=True)
            print(f"Created repository directory: {repo_path}")
        except Exception as e:
            print(f"Failed to create repository directory: {e}")
            return PlainTextResponse(
                content=f"# Failed to create repository directory: {str(e)}",
                status_code=500
            )
    
    # Check if it's already a Git repository
    try:
        # Use git command to check if it's a git repository
        result = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], 
                               cwd=repo_path, 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE)
        is_git_repo = result.returncode == 0
        print(f"Is Git repo check result: {is_git_repo}, returncode: {result.returncode}")
    except Exception as e:
        print(f"Error checking if Git repo: {e}")
        is_git_repo = False
    
    # Initialize if not a Git repository
    if not is_git_repo:
        print(f"Initializing Git repository at {repo_path}")
        try:
            # Initialize Git repository
            result = subprocess.run(["git", "init"], 
                                  cwd=repo_path, 
                                  stdout=subprocess.PIPE, 
                                  stderr=subprocess.PIPE)
            if result.returncode != 0:
                error_msg = result.stderr.decode()
                print(f"Git init failed: {error_msg}")
                return PlainTextResponse(
                    content=f"# Failed to initialize Git repository: {error_msg}",
                    status_code=500
                )
                
            # Create an initial README.md
            readme_path = repo_path / "README.md"
            with open(readme_path, "w") as f:
                f.write(f"# {repository.name}\n\n{repository.description or 'Repository created with Project Monitor'}\n")
            
            # Configure Git user
            subprocess.run(["git", "config", "user.email", "system@projectmonitor.com"], cwd=repo_path)
            subprocess.run(["git", "config", "user.name", "Project Monitor System"], cwd=repo_path)
            
            # Make initial commit
            add_result = subprocess.run(["git", "add", "README.md"], 
                                      cwd=repo_path,
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            if add_result.returncode != 0:
                print(f"Git add failed: {add_result.stderr.decode()}")
            
            commit_result = subprocess.run(["git", "commit", "-m", "Initial commit with README"], 
                                         cwd=repo_path,
                                         stdout=subprocess.PIPE, 
                                         stderr=subprocess.PIPE)
            if commit_result.returncode != 0:
                print(f"Git commit failed: {commit_result.stderr.decode()}")
                
            print(f"Git repository initialized successfully at {repo_path}")
            
        except Exception as e:
            print(f"Exception initializing Git repository: {e}")
            return PlainTextResponse(
                content=f"# Failed to initialize repository: {str(e)}",
                status_code=500
            )

    try:
        # Run git command to get refs
        cmd = ["git", service[4:], "--stateless-rpc", "--advertise-refs", "."]
        print(f"Running command: {' '.join(cmd)} in {repo_path}")
        
        process = subprocess.Popen(
            cmd,
            cwd=repo_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            print(f"Git command error: {stderr.decode()}")
            return PlainTextResponse(
                content=f"# Git command failed: {stderr.decode()}",
                status_code=500
            )
        
        # Prepare Git HTTP response
        # See: https://git-scm.com/docs/http-protocol
        packet = f"# service={service}\\n"
        prefix = f"{len(packet) + 4:04x}"  # 4 byte hex length including itself
        first_line = f"{prefix}{packet}0000"  # packet line followed by flush
        
        response_content = first_line.encode() + stdout
        
        headers = {
            "Content-Type": f"application/x-{service}-advertisement",
            "Cache-Control": "no-cache",
        }
        
        return Response(content=response_content, headers=headers)
    
    except Exception as e:
        print(f"Error in get_info_refs: {str(e)}")
        return PlainTextResponse(
            content=f"# Server error: {str(e)}",
            status_code=500
        )


# Git upload-pack endpoint (used for git fetch, clone, pull)
@router.post("/{repository_id}.git/git-upload-pack")
async def git_upload_pack(
    repository_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """Git HTTP endpoint for upload-pack service (clone, fetch, pull)"""
    # Check if repository exists and user has access
    try:
        user_id = str(current_user.id) if current_user else None
        repository = check_repository_access(repository_id, user_id, db)
    except HTTPException as e:
        return PlainTextResponse(
            content=f"# Repository not found or you don't have access: {e.detail}",
            status_code=e.status_code
        )
    
    # Get request body
    body = await request.body()
    
    # Get repository path
    repo_path = get_repo_path(repository_id)
    
    try:
        # Run git-upload-pack command
        cmd = ["git", "upload-pack", "--stateless-rpc", "."]
        process = subprocess.Popen(
            cmd,
            cwd=repo_path,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        stdout, stderr = process.communicate(input=body)
        
        if process.returncode != 0:
            print(f"Git upload-pack error: {stderr.decode()}")
            return PlainTextResponse(
                content=f"# Git command failed: {stderr.decode()}",
                status_code=500
            )
        
        headers = {
            "Content-Type": "application/x-git-upload-pack-result",
            "Cache-Control": "no-cache",
        }
        
        return Response(content=stdout, headers=headers)
    
    except Exception as e:
        print(f"Error in git_upload_pack: {str(e)}")
        return PlainTextResponse(
            content=f"# Server error: {str(e)}",
            status_code=500
        )


# Git receive-pack endpoint (used for git push)
@router.post("/{repository_id}.git/git-receive-pack")
async def git_receive_pack(
    repository_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """Git HTTP endpoint for receive-pack service (push)"""
    # Check if repository exists and user has access
    try:
        user_id = str(current_user.id) if current_user else None
        if not user_id:
            return PlainTextResponse(
                content="# Authentication required for pushing to repository",
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        
        repository = check_repository_access(repository_id, user_id, db)
        
        # For push operations, make sure user has write access (owner or member with proper role)
        if str(repository.owner_id) != user_id:
            member = db.query(RepositoryMember).filter(
                RepositoryMember.repository_id == repository_id,
                RepositoryMember.user_id == user_id,
                RepositoryMember.is_active == True,
                RepositoryMember.role.in_(["contributor", "admin"])
            ).first()
            
            if not member:
                return PlainTextResponse(
                    content="# You don't have write access to this repository",
                    status_code=status.HTTP_403_FORBIDDEN
                )
    
    except HTTPException as e:
        return PlainTextResponse(
            content=f"# Repository not found or you don't have access: {e.detail}",
            status_code=e.status_code
        )
    
    # Get request body
    body = await request.body()
    
    # Get repository path
    repo_path = get_repo_path(repository_id)
    
    try:
        # Run git-receive-pack command
        cmd = ["git", "receive-pack", "--stateless-rpc", "."]
        process = subprocess.Popen(
            cmd,
            cwd=repo_path,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        stdout, stderr = process.communicate(input=body)
        
        if process.returncode != 0:
            print(f"Git receive-pack error: {stderr.decode()}")
            return PlainTextResponse(
                content=f"# Git command failed: {stderr.decode()}",
                status_code=500
            )
        
        headers = {
            "Content-Type": "application/x-git-receive-pack-result",
            "Cache-Control": "no-cache",
        }
        
        return Response(content=stdout, headers=headers)
    
    except Exception as e:
        print(f"Error in git_receive_pack: {str(e)}")
        return PlainTextResponse(
            content=f"# Server error: {str(e)}",
            status_code=500
        )
