import { useEffect, useState } from 'react';
import { Select, Breadcrumbs, Anchor, Group, Loader, Stack, Text, Card } from '@mantine/core';
import apiClient from '../../api/client';
// FileViewer moved to a separate page
import BranchActions from './BranchActions';
import { useNavigate } from 'react-router-dom';

interface GitFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number | null;
}

interface GitBranch {
  name: string;
  is_default?: boolean;
}

export default function RepositoryFileExplorer({ repositoryId }: { repositoryId: string }) {
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<GitFile[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // file preview opens in a separate page now

  useEffect(() => {
    async function loadBranches() {
      const { data } = await apiClient.get<GitBranch[]>(`/repositories/${repositoryId}/branches`);
      setBranches(data);
      const def = data.find((b) => (b as any).is_default) || data[0];
      setCurrentBranch(def?.name || '');
    }
    loadBranches();
  }, [repositoryId]);

  useEffect(() => {
    if (!currentBranch) return;
    loadFiles('');
  }, [currentBranch, repositoryId]);

  async function loadFiles(path: string) {
    setLoading(true);
    try {
      const { data } = await apiClient.get<GitFile[]>(`/repositories/${repositoryId}/files`, {
        params: { branch: currentBranch, path },
      });
      setFiles(data);
      setCurrentPath(path);
      await loadReadme(path, data);
    } finally {
      setLoading(false);
    }
  }

  async function loadReadme(_path: string, list: GitFile[]) {
    const readmeFile = list.find((f) => f.type === 'file' && f.name.toLowerCase() === 'readme.md');
    if (readmeFile) {
      try {
        const { data } = await apiClient.get<{ content: string }>(`/repositories/${repositoryId}/content/${readmeFile.path}`, {
          params: { branch: currentBranch },
        });
        setReadme(data.content);
      } catch {
        setReadme(null);
      }
    } else {
      setReadme(null);
    }
  }

  const crumbs = [{ title: 'root', path: '' }].concat(
    currentPath
      ? currentPath.split('/').map((seg, idx, arr) => ({ title: seg, path: arr.slice(0, idx + 1).join('/') }))
      : []
  );

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Breadcrumbs>
          {crumbs.map((c) => (
            <Anchor key={c.path} onClick={() => loadFiles(c.path)}>
              {c.title || 'root'}
            </Anchor>
          ))}
        </Breadcrumbs>
        <Group>
          <Select
            placeholder="Выбери ветку"
            data={branches.map((b) => ({ value: b.name, label: b.name }))}
            value={currentBranch}
            onChange={(v) => v && setCurrentBranch(v)}
            w={220}
          />
          <BranchActions repositoryId={repositoryId} branches={branches} currentBranch={currentBranch} onCreated={(name) => setCurrentBranch(name)} />
        </Group>
      </Group>

      {loading ? (
        <Group justify="center" mt="md">
          <Loader />
        </Group>
      ) : (
        <Card withBorder padding="md">
          <Stack>
            {files.map((f) => (
              <Group key={f.path} justify="space-between" onClick={() => (f.type === 'directory' ? loadFiles(f.path) : navigate(`/repositories/${repositoryId}/file?branch=${encodeURIComponent(currentBranch)}&path=${encodeURIComponent(f.path)}`))} style={{ cursor: 'pointer' }}>
                <Text fw={500}>{f.name}</Text>
                <Text size="xs" c="dimmed">{f.type}</Text>
              </Group>
            ))}
          </Stack>
        </Card>
      )}


      {readme && (
        <Card withBorder padding="md">
          <Text fw={600} mb={6}>README.md</Text>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{readme}</pre>
        </Card>
      )}
    </Stack>
  );
}


