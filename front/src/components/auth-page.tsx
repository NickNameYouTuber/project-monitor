import React from 'react';
import { GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LoginButton } from '@niid/sdk/react';
import '@niid/sdk/styles';

export function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">NIGIt</h1>
          <p className="text-muted-foreground">Project management made simple</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to continue to your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginButton
              clientId={import.meta.env.VITE_NIID_CLIENT_ID || 'r0n86C5hVO6J04nDJwe_0A'}
              ssoUrl={import.meta.env.VITE_NIID_SSO_URL || 'https://auth.id.nicorp.tech'}
              apiUrl={import.meta.env.VITE_NIID_API_URL || 'https://api.id.nicorp.tech'}
              redirectUri={window.location.origin + '/sso/niid/callback'}
              variant="brand"
              className="w-full"
              onSuccess={(user) => {
                console.log('Login success:', user);
                window.location.href = '/';
              }}
              onError={(error) => {
                console.error('Login failed:', error);
              }}
            >
              Continue with NIID
            </LoginButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
