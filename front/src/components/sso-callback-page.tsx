import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from './loading-spinner';
import { Box, Flex, Heading, Text, Card, CardContent, Button } from '@nicorp/nui';
import { handleSSOCallback } from '../api/sso';
import { setAccessToken, getAccessToken } from '../api/client';

export function SSOCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    const orgId = searchParams.get('orgId');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[SSO] Callback params:', { token: !!token, orgId, code: !!code, state: !!state, error });

    // Проверка на ошибку от backend
    if (error) {
      setError(`SSO authentication failed: ${error}`);
      setProcessing(false);
      return;
    }

    // Новый flow: токен напрямую из backend
    if (token && orgId && orgId !== 'undefined' && orgId !== 'null') {
      console.log('[SSO] Processing token callback with orgId:', orgId);
      setAccessToken(token);
      localStorage.setItem('currentOrgId', orgId);
      sessionStorage.setItem(`org_verified_${orgId}`, 'true');
      setProcessing(false);
      navigate(`/${orgId}/projects`, { replace: true });
      return;
    }

    // Старый flow: обработка через API (на случай если backend не обновлен)
    if (!code || !state) {
      console.error('[SSO] Missing required parameters');
      setError('Invalid callback parameters. Please try again.');
      setProcessing(false);
      return;
    }

    console.log('[SSO] Using API callback flow');
    processCallback(code, state);
  }, [searchParams, navigate]);

  const processCallback = async (code: string, state: string) => {
    try {
      console.log('[SSO] Calling handleSSOCallback API...');
      const result = await handleSSOCallback(code, state);
      console.log('[SSO] API response:', result);

      if (!result.organization_id || result.organization_id === 'undefined') {
        throw new Error('Invalid organization_id from SSO callback');
      }

      if (!result.token) {
        throw new Error('No token received from SSO callback');
      }

      console.log('[SSO] Processing API callback with orgId:', result.organization_id);
      console.log('[SSO] Token received (length):', result.token.length);

      // Установить новый токен с org_verified
      setAccessToken(result.token);

      // Проверить что токен действительно установлен
      const verifyToken = getAccessToken();
      console.log('[SSO] Token verified in localStorage:', verifyToken === result.token);

      localStorage.setItem('currentOrgId', result.organization_id);
      sessionStorage.setItem(`org_verified_${result.organization_id}`, 'true');

      setProcessing(false);

      // Небольшая задержка чтобы токен точно установился
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[SSO] Navigating to:', `/${result.organization_id}/projects`);
      navigate(`/${result.organization_id}/projects`, { replace: true });
    } catch (error) {
      console.error('[SSO] Callback error:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete SSO authentication. Please try again.');
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <Flex className="h-screen items-center justify-center">
        <LoadingSpinner stages={['Processing SSO authentication']} />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex className="h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Heading level={3} className="text-lg font-semibold mb-2">Authentication Failed</Heading>
            <Text className="text-muted-foreground mb-4">{error}</Text>
            <Button onClick={() => navigate('/organizations')}>
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </Flex>
    );
  }

  return null;
}

