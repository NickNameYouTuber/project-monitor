import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Box, Flex, Text } from '@nicorp/nui';
import { LoadingSpinner } from './loading-spinner';
import { useNotifications } from '../hooks/useNotifications';
import { getInviteInfo, acceptInvite } from '../api/organization-invites';
import type { OrganizationInvite } from '../types/organization';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [invite, setInvite] = useState<OrganizationInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadInvite();
    }
  }, [token]);

  const loadInvite = async () => {
    if (!token) return;
    try {
      const inviteData = await getInviteInfo(token);
      if (!inviteData.is_valid) {
        setError('This invitation is no longer valid');
      }
      setInvite(inviteData);
    } catch (error) {
      setError('Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await acceptInvite(token);
      showSuccess('Successfully joined organization!');
      navigate('/organizations');
    } catch (error) {
      showError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner stages={['Loading Invitation']} />;
  }

  if (error || !invite) {
    return (
      <Flex className="h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <Flex className="items-center gap-3">
              <XCircle className="w-8 h-8 text-destructive" />
              <CardTitle>Invalid Invitation</CardTitle>
            </Flex>
          </CardHeader>
          <CardContent>
            <Text className="text-muted-foreground">{error || 'This invitation link is invalid or has expired.'}</Text>
            <Button className="mt-4" onClick={() => navigate('/organizations')}>
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex className="h-full items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <Flex className="items-center gap-3">
            <Flex className="w-12 h-12 bg-primary/10 rounded-lg items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </Flex>
            <Box>
              <CardTitle>Join Organization</CardTitle>
              <CardDescription>{invite.organization_name}</CardDescription>
            </Box>
          </Flex>
        </CardHeader>
        <CardContent className="space-y-4">
          <Box>
            <Text className="text-sm text-muted-foreground">
              You've been invited to join <Text as="span" className="font-medium text-foreground">{invite.organization_name}</Text> as a <Text as="span" className="font-medium text-foreground">{invite.role}</Text>.
            </Text>
          </Box>

          {invite.expires_at && (
            <Text className="text-xs text-muted-foreground">
              This invitation expires on {new Date(invite.expires_at).toLocaleDateString()}
            </Text>
          )}

          <Flex className="gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate('/organizations')} className="flex-1">
              Decline
            </Button>
            <Button onClick={handleAccept} disabled={accepting} className="flex-1">
              {accepting ? 'Joining...' : 'Accept Invitation'}
            </Button>
          </Flex>
        </CardContent>
      </Card>
    </Flex>
  );
}

