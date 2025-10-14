import { useState, useEffect } from 'react';
import { checkRepositoryAccess } from '../api/permissions';
import type { RepositoryPermissions } from '../types/permissions';

const defaultPermissions: RepositoryPermissions = {
  hasAccess: false,
  role: null,
  canPush: false,
  canMerge: false,
  canCreateBranch: false,
  canDeleteBranch: false,
  canEditFiles: false,
  canManageSettings: false,
  canManageMembers: false,
  canDeleteRepository: false,
  canCreateIssue: false,
};

export function useRepositoryPermissions(repositoryId: string | undefined) {
  const [permissions, setPermissions] = useState<RepositoryPermissions>(defaultPermissions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repositoryId) {
      setPermissions(defaultPermissions);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const perms = await checkRepositoryAccess(repositoryId);
        if (!cancelled) {
          setPermissions(perms);
        }
      } catch (error) {
        console.error('Failed to check repository access:', error);
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
  }, [repositoryId]);

  return { ...permissions, loading };
}
