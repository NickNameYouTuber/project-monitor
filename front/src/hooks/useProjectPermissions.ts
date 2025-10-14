import { useState, useEffect } from 'react';
import { checkProjectAccess } from '../api/permissions';
import type { ProjectPermissions } from '../types/permissions';

const defaultPermissions: ProjectPermissions = {
  hasAccess: false,
  role: null,
  canEditProject: false,
  canDeleteProject: false,
  canManageMembers: false,
  canCreateTasks: false,
  canEditTasks: false,
};

export function useProjectPermissions(projectId: string | undefined) {
  const [permissions, setPermissions] = useState<ProjectPermissions>(defaultPermissions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setPermissions(defaultPermissions);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const perms = await checkProjectAccess(projectId);
        if (!cancelled) {
          setPermissions(perms);
        }
      } catch (error) {
        console.error('Failed to check project access:', error);
        if (!cancelled) {
          setPermissions(defaultPermissions);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { ...permissions, loading };
}

