import React from 'react';
import { Crown, Settings, Code, FileText, Eye, Wrench, User } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

import { OrgRole } from '../types/organization';

interface RoleBadgeProps {
  role: string | OrgRole;
  type?: 'project' | 'repository';
  variant?: 'default' | 'outline' | 'secondary';
}

export function RoleBadge({ role, type = 'project', variant = 'outline' }: RoleBadgeProps) {
  // Handle OrgRole object
  if (typeof role !== 'string') {
    return (
      <Badge
        variant={variant}
        className={cn('gap-1 border-current')}
        style={{
          color: role.color,
          borderColor: variant === 'outline' ? role.color : undefined,
          backgroundColor: variant === 'default' ? role.color : undefined
        }}
      >
        {/* We can use a generic icon or specific one if we map it, for now just text or default icon */}
        <Settings className="w-3 h-3" />
        {role.name}
      </Badge>
    );
  }

  const getRoleConfig = () => {
    switch (role.toUpperCase()) {
      case 'OWNER':
        return { icon: Crown, label: 'Owner', className: 'text-yellow-600 border-yellow-600' };
      case 'ADMIN':
        return { icon: Settings, label: 'Admin', className: 'text-red-600 border-red-600' };
      case 'DEVELOPER':
        return { icon: Code, label: 'Developer', className: 'text-blue-600 border-blue-600' };
      case 'MAINTAINER':
        return { icon: Wrench, label: 'Maintainer', className: 'text-orange-600 border-orange-600' };
      case 'REPORTER':
        return { icon: FileText, label: 'Reporter', className: 'text-purple-600 border-purple-600' };
      case 'VIEWER':
        return { icon: Eye, label: 'Viewer', className: 'text-gray-600 border-gray-600' };
      case 'MEMBER':
        return { icon: User, label: 'Member', className: 'text-blue-500 border-blue-500' };
      case 'GUEST':
        return { icon: Eye, label: 'Guest', className: 'text-gray-500 border-gray-500' };
      default:
        // Try to handle potential custom role names that come as string 
        // We calculate a hash color or just grey
        return { icon: Eye, label: role, className: 'text-gray-600 border-gray-600' };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  return (
    <Badge variant={variant} className={cn('gap-1', config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

