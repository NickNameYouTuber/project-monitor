import React, { useState } from 'react';
import { GitBranch, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { NIIDClient } from '@niid/sdk';

// Configure NIID Client
const niid = new NIIDClient({
  clientId: import.meta.env.VITE_NIID_CLIENT_ID || 'r0n86C5hVO6J04nDJwe_0A',
  ssoUrl: import.meta.env.VITE_NIID_SSO_URL || 'https://auth.id.nicorp.tech',
  apiUrl: import.meta.env.VITE_NIID_API_URL || 'https://api.id.nicorp.tech',
  redirectUri: window.location.origin + '/sso/niid/callback'
});

interface AuthPageProps {
  onLogin: () => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      console.log('Starting login with config:', niid);
      // Method is directly on instance, not under .auth
      niid.login();
    } catch (e) {
      console.error('Login failed', e);
      setIsLoading(false);
    }
  };

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
            <Button
              className="w-full h-12 text-base"
              onClick={handleLogin}
              disabled={isLoading}
            >
              <Shield className="w-5 h-5 mr-2" />
              {isLoading ? 'Redirecting...' : 'Continue with NIID'}
            </Button>


          </CardContent>
        </Card>
      </div>
    </div>
  );
}
