import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getOrganization } from '../api/organizations';
import type { Organization } from '../types/organization';
import { LoadingSpinner } from './loading-spinner';

interface OrganizationGuardProps {
  children: React.ReactNode;
}

export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    checkOrganization();
  }, []);

  const checkOrganization = async () => {
    const currentOrgId = localStorage.getItem('currentOrgId');
    const orgVerified = sessionStorage.getItem(`org_verified_${currentOrgId}`);
    
    if (!currentOrgId) {
      setLoading(false);
      return;
    }

    if (orgVerified === 'true') {
      setVerified(true);
      setLoading(false);
      return;
    }

    try {
      const org = await getOrganization(currentOrgId);
      setOrganization(org);
      
      if (org.require_password || (org.sso_enabled && org.sso_require_sso)) {
        setVerified(false);
        setLoading(false);
      } else {
        sessionStorage.setItem(`org_verified_${currentOrgId}`, 'true');
        setVerified(true);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner stages={['Checking organization access']} />;
  }

  const currentOrgId = localStorage.getItem('currentOrgId');
  
  if (!currentOrgId || !verified) {
    return <Navigate to="/organizations" replace />;
  }

  return <>{children}</>;
}

