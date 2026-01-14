import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Label, Textarea, Switch, Separator,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import { createOrganization } from '../api/organizations';
import { useNotifications } from '../hooks/useNotifications';
import { toast } from 'sonner';

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
    requirePassword: false,
    password: '',
    corporateDomain: '',
    requireCorporateEmail: false,
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setCreating(true);
    try {
      const org = await createOrganization({
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        website: formData.website || undefined,
        require_password: formData.requirePassword,
        password: formData.requirePassword ? formData.password : undefined,
        corporate_domain: formData.corporateDomain || undefined,
        require_corporate_email: formData.requireCorporateEmail,
      });

      showSuccess(`Organization "${org.name}" created successfully`);
      localStorage.setItem('currentOrgId', org.id);
      navigate(`/${org.id}/projects`);
    } catch (error) {
      console.error('Failed to create organization:', error);
      showError('Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  return (
    <Flex className="h-full flex-col">
      <Box className="border-b border-border p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/organizations')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Organizations
        </Button>
        <Flex className="items-center gap-3">
          <Flex className="w-12 h-12 bg-primary/10 rounded-lg items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </Flex>
          <Box>
            <Heading level={2} className="text-2xl font-semibold">Create Organization</Heading>
            <Text className="text-muted-foreground">Set up a new organization for your team</Text>
          </Box>
        </Flex>
      </Box>

      <Box className="flex-1 p-6 overflow-auto">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <Box as="form" onSubmit={handleSubmit} className="space-y-6">
              <Box>
                <Label>Organization Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ACME Corporation"
                  required
                />
              </Box>

              <Box>
                <Label>Slug (URL)</Label>
                <Flex className="gap-2">
                  <Flex className="flex-1 items-center gap-2">
                    <Text as="span" className="text-sm text-muted-foreground">nit.nicorp.tech/org/</Text>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="acme-corp"
                    />
                  </Flex>
                  <Button type="button" variant="outline" onClick={generateSlug}>
                    Generate
                  </Button>
                </Flex>
                <Text className="text-xs text-muted-foreground mt-1">
                  Leave empty to auto-generate from name
                </Text>
              </Box>

              <Box>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your organization..."
                  rows={3}
                />
              </Box>

              <Box>
                <Label>Website</Label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://acme.com"
                />
              </Box>

              <Separator />

              <VStack className="space-y-4">
                <Heading level={4} className="font-medium">Security Settings</Heading>

                <Flex className="items-start justify-between gap-4">
                  <Box className="flex-1">
                    <Label>Require Organization Password</Label>
                    <Text className="text-xs text-muted-foreground mt-1">
                      Members will need an additional password to access this organization
                    </Text>
                  </Box>
                  <Switch
                    checked={formData.requirePassword}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requirePassword: checked }))}
                  />
                </Flex>

                {formData.requirePassword && (
                  <Box>
                    <Label>Organization Password</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter organization password"
                    />
                  </Box>
                )}

                <Flex className="items-start justify-between gap-4">
                  <Box className="flex-1">
                    <Label>Corporate Email Domain</Label>
                    <Text className="text-xs text-muted-foreground mt-1">
                      Restrict membership to specific email domains
                    </Text>
                  </Box>
                  <Input
                    value={formData.corporateDomain}
                    onChange={(e) => setFormData(prev => ({ ...prev, corporateDomain: e.target.value }))}
                    placeholder="@company.com"
                    className="w-48"
                  />
                </Flex>

                <Flex className="items-start justify-between gap-4">
                  <Box className="flex-1">
                    <Label>Require Corporate Email</Label>
                    <Text className="text-xs text-muted-foreground mt-1">
                      All members must verify a corporate email
                    </Text>
                  </Box>
                  <Switch
                    checked={formData.requireCorporateEmail}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireCorporateEmail: checked }))}
                  />
                </Flex>
              </VStack>

              <Flex className="justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/organizations')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || !formData.name.trim()}>
                  {creating ? 'Creating...' : 'Create Organization'}
                </Button>
              </Flex>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Flex>
  );
}

