import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { getOrganization, verifyOrganizationPassword } from '../api/organizations';
import { initiateSSOLogin } from '../api/sso';
import type { Organization } from '../types/organization';
import { LoadingSpinner } from './loading-spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface OrganizationGuardProps {
  children: React.ReactNode;
}

export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [verified, setVerified] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

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
      setLoading(false);
    }
  };

  const handleSSOLogin = async (org: Organization) => {
    try {
      const response = await initiateSSOLogin(org.id);
      window.location.href = response.authorization_url;
    } catch (error) {
      toast.error('Failed to initiate SSO login');
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!organization) return;
    
    setVerifying(true);
    try {
      const isValid = await verifyOrganizationPassword(organization.id, password);
      if (isValid) {
        sessionStorage.setItem(`org_verified_${organization.id}`, 'true');
        setVerified(true);
        setShowPasswordDialog(false);
        setPassword('');
      } else {
        toast.error('Incorrect password');
      }
    } catch (error) {
      toast.error('Failed to verify password');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner stages={['Checking organization access']} />;
  }

  const currentOrgId = localStorage.getItem('currentOrgId');
  
  if (!currentOrgId) {
    return <Navigate to="/organizations" replace />;
  }

  if (!verified) {
    return (
      <>
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Organization Password Required</DialogTitle>
              <DialogDescription>
                This organization requires a password to access. Please enter the password to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  placeholder="Enter organization password"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.location.href = '/organizations'}>
                  Cancel
                </Button>
                <Button onClick={handleVerifyPassword} disabled={!password || verifying}>
                  {verifying ? 'Verifying...' : 'Continue'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please authenticate to access this organization</p>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}

