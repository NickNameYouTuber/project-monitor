import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from './loading-spinner';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { handleSSOCallback } from '../api/sso';
import { setAccessToken } from '../api/client';

export function SSOCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setError('Invalid callback parameters');
      setProcessing(false);
      return;
    }

    processCallback(code, state);
  }, [searchParams]);

  const processCallback = async (code: string, state: string) => {
    try {
      const result = await handleSSOCallback(code, state);
      
      localStorage.setItem('currentOrgId', result.organization_id);
      sessionStorage.setItem(`org_verified_${result.organization_id}`, 'true');
      
      navigate('/projects');
    } catch (error) {
      console.error('SSO callback error:', error);
      setError('Failed to complete SSO authentication');
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner stages={['Processing SSO authentication']} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">Authentication Failed</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/organizations')}>
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

