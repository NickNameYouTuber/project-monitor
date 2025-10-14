import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { Key, Copy, RefreshCw, Shield } from 'lucide-react';
import { 
  enableIdentityProvider, 
  getIdentityProviderConfig, 
  generateApiKeys, 
  rotateApiSecret,
  updateIdentityProviderConfig 
} from '../api/identity-provider';
import type { IdentityProviderConfig } from '../types/corporate-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface IdentityProviderSettingsProps {
  organizationId: string;
}

export function IdentityProviderSettings({ organizationId }: IdentityProviderSettingsProps) {
  const [config, setConfig] = useState<Partial<IdentityProviderConfig> | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  
  const [showApiKeysDialog, setShowApiKeysDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  useEffect(() => {
    loadConfig();
  }, [organizationId]);

  useEffect(() => {
    if (config) {
      setProviderName(config.provider_name || '');
      setWebhookUrl(config.webhook_url || '');
      setAllowedDomains(config.allowed_domains || '');
      setRequireEmailVerification(config.require_email_verification ?? true);
    }
  }, [config]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getIdentityProviderConfig(organizationId);
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableProvider = async () => {
    try {
      const result = await enableIdentityProvider(organizationId, providerName);
      if (result.success) {
        toast.success('Identity Provider enabled');
        loadConfig();
      }
    } catch (error) {
      toast.error('Failed to enable Identity Provider');
    }
  };

  const handleGenerateKeys = async () => {
    try {
      const result = await generateApiKeys(organizationId);
      if (result.success) {
        setApiKey(result.api_key);
        setApiSecret(result.api_secret);
        setShowApiKeysDialog(true);
        toast.success('API credentials generated');
        loadConfig();
      }
    } catch (error) {
      toast.error('Failed to generate API keys');
    }
  };

  const handleRotateSecret = async () => {
    if (!confirm('Are you sure you want to rotate the API secret? This will invalidate the current secret.')) {
      return;
    }
    
    try {
      const result = await rotateApiSecret(organizationId);
      if (result.success) {
        setApiSecret(result.api_secret);
        setShowApiKeysDialog(true);
        toast.success('API secret rotated');
      }
    } catch (error) {
      toast.error('Failed to rotate API secret');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await updateIdentityProviderConfig(organizationId, {
        provider_name: providerName,
        webhook_url: webhookUrl,
        allowed_domains: allowedDomains,
        require_email_verification: requireEmailVerification,
      } as any);
      toast.success('Configuration saved');
      loadConfig();
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {!config?.enabled ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <CardTitle>Enable Identity Provider</CardTitle>
                <CardDescription>
                  Turn your organization into an identity provider for external integrations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Provider Name</Label>
                <Input
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="My Company SSO"
                />
              </div>
              <Button onClick={handleEnableProvider}>
                Enable Identity Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Identity Provider Configuration</CardTitle>
              <CardDescription>Manage your organization's identity provider settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Provider Name</Label>
                <Input
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="My Company SSO"
                />
              </div>
              
              <div>
                <Label>Webhook URL (optional)</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-service.com/webhook"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Receive notifications about password changes
                </p>
              </div>
              
              <div>
                <Label>Allowed Domains (comma-separated)</Label>
                <Input
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="@company.com, @subsidiary.com"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Require Email Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Users must verify their corporate email
                  </p>
                </div>
                <Switch
                  checked={requireEmailVerification}
                  onCheckedChange={setRequireEmailVerification}
                />
              </div>
              
              <Button onClick={handleSaveConfig}>
                Save Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Credentials</CardTitle>
              <CardDescription>Manage API keys for external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config.has_api_key ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate API credentials to allow external services to authenticate users through your organization
                  </p>
                  <Button onClick={handleGenerateKeys}>
                    <Key className="w-4 h-4 mr-2" />
                    Generate API Keys
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">API Key</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRotateSecret}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Rotate Secret
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs font-mono mb-2">Endpoint:</p>
                    <code className="text-xs">POST /api/identity-provider/authenticate</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use your API key and secret in request headers
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={showApiKeysDialog} onOpenChange={setShowApiKeysDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>API Credentials</DialogTitle>
                <DialogDescription>
                  Save these credentials securely. The secret will not be shown again.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>API Key</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey, 'API Key')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input value={apiKey} readOnly className="font-mono text-xs" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>API Secret</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiSecret, 'API Secret')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input value={apiSecret} readOnly className="font-mono text-xs" />
                </div>
                
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    Warning: Store these credentials securely. The secret cannot be retrieved again.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setShowApiKeysDialog(false)}>
                  I've Saved the Credentials
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

