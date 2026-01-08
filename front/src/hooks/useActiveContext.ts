import { useLocation, useParams } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

export type ContextType = 'global' | 'organization' | 'project' | 'task' | 'repository' | 'file' | 'whiteboard' | 'call' | 'settings';

export interface ActiveContext {
    type: ContextType;
    id?: string;
    name?: string;
    metadata?: Record<string, any>;
    description?: string;
}

export function useActiveContext(): ActiveContext {
    const location = useLocation();
    const params = useParams();
    const { currentOrganization, currentProject } = useAppContext();
    const path = location.pathname;

    // 1. File Context (Most specific)
    if (path.includes('/file/') && params.repoId) {
        const filePath = path.split('/file/')[1];
        return {
            type: 'file',
            id: filePath,
            name: filePath.split('/').pop() || 'File',
            metadata: {
                repoId: params.repoId,
                projectId: currentProject?.id,
                path: filePath
            },
            description: `Editing file in ${params.repoId}`
        };
    }

    // 2. Repository Context
    if (path.includes('/repository/') && params.repoId) {
        return {
            type: 'repository',
            id: params.repoId,
            name: params.repoId, // We might want to fetch the real name if available
            metadata: {
                projectId: currentProject?.id
            },
            description: `Browsing repository code`
        };
    }

    // 3. Task/Whiteboard/Calls specific pages
    if (path.endsWith('/tasks')) {
        return {
            type: 'task',
            id: 'board',
            name: 'Task Board',
            metadata: { projectId: currentProject?.id },
            description: 'Viewing project tasks'
        };
    }

    if (path.endsWith('/whiteboard')) {
        return {
            type: 'whiteboard',
            id: 'board',
            name: 'Whiteboard',
            metadata: { projectId: currentProject?.id },
            description: 'Brainstorming on whiteboard'
        };
    }

    // 4. Project Context (General)
    if (currentProject || params.projectId) {
        return {
            type: 'project',
            id: currentProject?.id || params.projectId,
            name: currentProject?.title || 'Project',
            metadata: {
                organizationId: currentOrganization?.id
            },
            description: 'Managing project'
        };
    }

    // 5. Organization Context
    if (currentOrganization || params.orgId) {
        return {
            type: 'organization',
            id: currentOrganization?.id || params.orgId,
            name: currentOrganization?.name || 'Organization',
            description: 'Organization overview'
        };
    }

    // 6. Global Fallback
    return {
        type: 'global',
        name: 'Global',
        description: 'General workspace'
    };
}
