import React, { useEffect, useState, useRef } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { getOrganization } from '../api/organizations';
import { initiateSSOLogin } from '../api/sso';
import type { Organization } from '../types/organization';
import { LoadingSpinner } from './loading-spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Button, Box, Flex, VStack, Heading, Text } from '@nicorp/nui';
import { useNotifications } from '../hooks/useNotifications';
import { setAccessToken, getAccessToken } from '../api/client';

interface OrganizationGuardProps {
  children: React.ReactNode;
}

export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { showError } = useNotifications();
  const guardNavigate = useNavigate();
  const prevOrgIdRef = useRef<string | undefined>(orgId);

  // Synchronous init: read sessionStorage RIGHT NOW to avoid the 1-frame flash
  const [loading, setLoading] = useState(() => {
    if (!orgId) return false;
    return sessionStorage.getItem(`org_verified_${orgId}`) !== 'true';
  });
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [verified, setVerified] = useState(() => {
    if (!orgId) return false;
    return sessionStorage.getItem(`org_verified_${orgId}`) === 'true';
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // Handle orgId changes (e.g., switching orgs) — reset state based on new orgId
    if (orgId !== prevOrgIdRef.current) {
      prevOrgIdRef.current = orgId;
      if (!orgId) {
        setLoading(false);
        setVerified(false);
        return;
      }
      const isVerified = sessionStorage.getItem(`org_verified_${orgId}`) === 'true';
      if (isVerified) {
        console.log('[OrganizationGuard] Org changed, already verified:', orgId);
        setVerified(true);
        setLoading(false);
        setShowPasswordDialog(false);
        return;
      }
      // New org, not verified — reset and check
      setVerified(false);
      setLoading(true);
      setShowPasswordDialog(false);
      setPassword('');
      localStorage.setItem('currentOrgId', orgId);
      checkOrganization(orgId);
      return;
    }

    if (!orgId) {
      setLoading(false);
      setVerified(false);
      return;
    }

    // Initial mount: if already verified via synchronous useState init, skip
    if (verified) {
      console.log('[OrganizationGuard] Already verified from sync init:', orgId);
      return;
    }

    // Not verified yet, proceed with check
    localStorage.setItem('currentOrgId', orgId);
    checkOrganization(orgId);
  }, [orgId]);

  const checkOrganization = async (currentOrgId: string) => {
    const orgVerified = sessionStorage.getItem(`org_verified_${currentOrgId}`);

    console.log('[OrganizationGuard] Checking organization:', currentOrgId);
    console.log('[OrganizationGuard] Verified flag:', orgVerified);
    console.log('[OrganizationGuard] Current token:', getAccessToken()?.substring(0, 20) + '...');

    if (!currentOrgId) {
      guardNavigate('/organizations', { replace: true });
      return;
    }

    if (orgVerified === 'true') {
      console.log('[OrganizationGuard] Already verified, granting access');
      setVerified(true);
      setLoading(false);
      return;
    }

    try {
      console.log('[OrganizationGuard] Fetching organization info...');
      const org = await getOrganization(currentOrgId);
      setOrganization(org);

      if (org.sso_enabled && org.sso_require_sso) {
        handleSSOLogin(org);
        return;
      }

      if (org.require_password) {
        setShowPasswordDialog(true);
        setLoading(false);
      } else {
        sessionStorage.setItem(`org_verified_${currentOrgId}`, 'true');
        setVerified(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('[OrganizationGuard] Failed to check organization:', currentOrgId, error);
      guardNavigate('/organizations', { replace: true });
    }
  };

  const handleSSOLogin = async (org: Organization) => {
    try {
      const response = await initiateSSOLogin(org.id);
      window.location.href = response.authorization_url;
    } catch (error) {
      showError('Failed to initiate SSO login');
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!organization) return;

    setVerifying(true);
    try {
      const response = await fetch(`/api/organizations/${organization.id}/verify-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setAccessToken(data.token);
          sessionStorage.setItem(`org_verified_${organization.id}`, 'true');
          setVerified(true);
          setShowPasswordDialog(false);
          setPassword('');
        }
      } else {
        showError('Incorrect password');
      }
    } catch (error) {
      showError('Failed to verify password');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner stages={['Checking organization access']} />;
  }

  if (!verified) {
    return (
      <>
        <Dialog open={showPasswordDialog} onOpenChange={() => { }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Organization Password Required</DialogTitle>
              <DialogDescription>
                Enter the password to access {organization?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Box>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  placeholder="Enter organization password"
                  autoFocus
                />
              </Box>
              <Flex className="justify-end gap-2">
                <Button variant="outline" onClick={() => guardNavigate('/organizations', { replace: true })}>
                  Cancel
                </Button>
                <Button onClick={handleVerifyPassword} disabled={!password || verifying}>
                  {verifying ? 'Verifying...' : 'Continue'}
                </Button>
              </Flex>
            </div>
          </DialogContent>
        </Dialog>

        <Flex className="h-screen items-center justify-center bg-background">
          <Box className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <Heading level={2} className="text-xl font-semibold mb-2">Authentication Required</Heading>
            <Text className="text-muted-foreground">Please authenticate to access this organization</Text>
          </Box>
        </Flex>
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Layout route wrapper: renders OrganizationGuard around an <Outlet />.
 * Use as `<Route path="/:orgId" element={<OrgGuardLayout />}>` to protect
 * all nested org routes with a single guard instance that never remounts
 * during tab navigation.
 */
export function OrgGuardLayout() {
  return (
    <OrganizationGuard>
      <Outlet />
    </OrganizationGuard>
  );
}
