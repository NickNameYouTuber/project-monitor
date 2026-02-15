import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator, cn
} from '@nicorp/nui';
import { useAppContext } from '../../contexts/AppContext';

interface BreadcrumbItemData {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItemData[];
  className?: string;
}

export function Breadcrumbs({ items: customItems, className }: BreadcrumbsProps) {
  const location = useLocation();
  const { currentOrganization, currentProject } = useAppContext();

  // Auto-generate breadcrumbs from URL if not provided
  const items: BreadcrumbItemData[] = customItems || generateBreadcrumbs(
    location.pathname,
    currentOrganization,
    currentProject
  );

  if (items.length <= 1) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="truncate max-w-[200px]">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.href} className="truncate max-w-[200px]">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function generateBreadcrumbs(
  pathname: string,
  org: any,
  project: any
): BreadcrumbItemData[] {
  const items: BreadcrumbItemData[] = [];

  if (pathname === '/organizations' || pathname === '/organizations/create') {
    items.push({ label: 'Organizations', href: '/organizations' });
    if (pathname.includes('create')) {
      items.push({ label: 'Create' });
    }
    return items;
  }

  const parts = pathname.split('/').filter(Boolean);

  // Org-level routes
  if (parts.length >= 1 && parts[0] !== 'organizations') {
    const orgId = parts[0];
    items.push({ label: 'Organizations', href: '/organizations' });

    if (org) {
      items.push({ label: org.name, href: `/${orgId}/projects` });
    }

    if (parts[1] === 'projects' && !parts[2]) {
      items.push({ label: 'Projects' });
    }

    if (parts[1] === 'projects' && parts[2]) {
      items.push({ label: 'Projects', href: `/${orgId}/projects` });
      if (project) {
        items.push({ label: project.title, href: `/${orgId}/projects/${parts[2]}/tasks` });
      }

      const section = parts[3];
      if (section) {
        const sectionLabels: Record<string, string> = {
          tasks: 'Tasks',
          whiteboard: 'Whiteboard',
          repositories: 'Repositories',
          repository: 'Repository',
          calls: 'Calls',
          settings: 'Settings',
        };
        items.push({ label: sectionLabels[section] || section });
      }
    }

    if (parts[1] === 'calls') {
      items.push({ label: 'Calls' });
    }

    if (parts[1] === 'settings') {
      items.push({ label: 'Settings' });
    }

    if (parts[1] === 'account-organization') {
      items.push({ label: 'Account' });
    }
  }

  return items.length > 0 ? items : [{ label: 'Home' }];
}
