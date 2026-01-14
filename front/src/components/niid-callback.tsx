import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Box, Flex, Text, Button } from '@nicorp/nui';
import { Loader2 } from 'lucide-react';
import { apiClient, setAccessToken } from '../api/client';
import { NIIDClient } from '@niid/sdk/react'; // Use React import for potential hooks if needed, or core class

const NIID_CLIENT_ID = import.meta.env.VITE_NIID_CLIENT_ID || 'project-monitor-app'; // Should be configured in .env

export function SSOCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = React.useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(errorParam);
                return;
            }

            if (!code) {
                setError('No authorization code received');
                return;
            }

            try {
                // Exchange code for session in project-monitor backend
                const redirectUri = window.location.origin + window.location.pathname;
                const response = await apiClient.post('/auth/niid', { code, redirectUri });

                const { token } = response.data;

                if (token) {
                    setAccessToken(token);
                    // Trigger auth change event to update App state
                    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { authenticated: true } }));
                    navigate('/');
                } else {
                    throw new Error('No token received from backend');
                }
            } catch (err: any) {
                console.error('SSO Error:', err);
                setError(err.response?.data?.message || err.message || 'Authentication failed');
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    return (
        <Flex className="min-h-screen bg-background items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center flex flex-col items-center gap-2">
                        {error ? (
                            <Text as="span" className="text-destructive">Authentication Failed</Text>
                        ) : (
                            <>
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <Text as="span">Signing in with NIID...</Text>
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    {error && (
                        <Text className="text-sm text-muted-foreground mb-4">
                            {error}
                        </Text>
                    )}
                    {error && (
                        <Button
                            variant="link"
                            onClick={() => navigate('/auth')}
                            className="text-primary hover:underline h-auto p-0"
                        >
                            Back to Login
                        </Button>
                    )}
                </CardContent>
            </Card>
        </Flex>
    );
}
