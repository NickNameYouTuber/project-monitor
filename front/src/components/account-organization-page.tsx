import React from 'react';
import { Shield, User, Mail, Calendar, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { LoadingSpinner } from './loading-spinner';
import { useMainAccount, useSSOAccount } from '../hooks/useAccountContext';
import { useCurrentOrganization } from '../hooks/useAppContext';

export function AccountOrganizationPage() {
  const { account: mainAccount } = useMainAccount();
  const { account: ssoAccount } = useSSOAccount();
  const { organization } = useCurrentOrganization();

  if (!organization) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner stages={['Loading organization...']} />
      </div>
    );
  }

  const mainEmail = mainAccount?.username || '';
  const ssoEmail = ssoAccount?.sso_email || null;
  const hasSSO = ssoEmail && ssoEmail !== mainEmail;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div>
          <h1>Account Organization</h1>
          <p className="text-muted-foreground">Your account information for {organization.name}</p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {hasSSO ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    SSO Account
                  </CardTitle>
                  <CardDescription>
                    Your Single Sign-On account linked to this organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </div>
                    <p className="text-lg font-medium">{ssoEmail}</p>
                  </div>
                  
                  {ssoAccount && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <LinkIcon className="w-4 h-4" />
                          <span>Provider ID</span>
                        </div>
                        <p className="text-sm font-mono">{ssoAccount.sso_provider_id}</p>
                      </div>
                      
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>Linked at</span>
                          </div>
                          <p className="text-sm">
                            {new Date(ssoAccount.linked_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>Last login</span>
                          </div>
                          <p className="text-sm">
                            {new Date(ssoAccount.last_login_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Main Account
                  </CardTitle>
                  <CardDescription>
                    Your primary account linked to the SSO account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </div>
                    <p className="text-lg font-medium">{mainEmail}</p>
                  </div>
                  
                  {mainAccount?.displayName && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Display Name</span>
                        </div>
                        <p className="text-sm">{mainAccount.displayName}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Your account information for {organization.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </div>
                  <p className="text-lg font-medium">{mainEmail}</p>
                </div>
                
                {mainAccount?.displayName && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>Display Name</span>
                      </div>
                      <p className="text-sm">{mainAccount.displayName}</p>
                    </div>
                  </>
                )}
                
                <Separator />
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No SSO account linked to this organization. You are using your main account.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
