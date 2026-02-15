import React, { useEffect, useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Users,
  Key,
  Database,
  Download,
  Upload
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Avatar,
  AvatarFallback,
  Separator,
  Box,
  Flex,
  VStack,
  Grid,
  Heading,
  Text,
} from '@nicorp/nui';
import { LoadingSpinner } from './loading-spinner';
import { PageHeader } from './shared/page-header';
import { useMainAccount, useAccountContext } from '../hooks/useAccountContext';

export function AccountPage() {
  const { mainAccount, updateMainAccount } = useAccountContext();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: 'Product Manager at NIGIt',
    timezone: 'UTC-5',
  });
  const [isLoading, setIsLoading] = useState(true);

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    projectUpdates: true,
    taskAssignments: true,
    comments: false,
  });

  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [tokens, setTokens] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [newTokenName, setNewTokenName] = useState('token');

  useEffect(() => {
    if (mainAccount) {
      setProfile((prev) => ({
        ...prev,
        name: mainAccount.displayName || mainAccount.username || '',
        email: mainAccount.username || '',
      }));
    }
  }, [mainAccount]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { listTokens } = await import('../api/tokens');
        const ts = await listTokens();
        setTokens(ts.map(t => ({ id: t.id, name: t.name, created_at: t.created_at })));
      } catch { }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleProfileUpdate = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationToggle = (field: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || !mainAccount) {
    return <LoadingSpinner
      stages={['Auth User', 'Load Profile', 'Fetch Tokens', 'Ready']}
    />;
  }

  return (
    <Flex className="h-full flex-col">
      <PageHeader
        title="Account"
        subtitle="Manage your personal settings and preferences"
      />

      <Box className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="profile" className="h-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Flex className="items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="text-xl">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <VStack className="space-y-2">
                    <Button variant="outline" size="sm">Change Avatar</Button>
                    <Button variant="ghost" size="sm">Remove</Button>
                  </VStack>
                </Flex>

                <Grid className="grid-cols-2 gap-4">
                  <VStack className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => handleProfileUpdate('name', e.target.value)}
                    />
                  </VStack>
                  <VStack className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleProfileUpdate('email', e.target.value)}
                    />
                  </VStack>
                </Grid>

                <VStack className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                    rows={3}
                  />
                </VStack>

                <VStack className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={profile.timezone} onValueChange={(value) => handleProfileUpdate('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                      <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="UTC+0">UTC</SelectItem>
                      <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
                    </SelectContent>
                  </Select>
                </VStack>

                <Button onClick={async () => {
                  try {
                    await updateMainAccount({ displayName: profile.name, username: profile.email });
                  } catch { }
                }}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <VStack className="space-y-4">
                  <Flex className="items-center justify-between">
                    <Box>
                      <Heading level={4} className="font-medium">Email Notifications</Heading>
                      <Text size="sm" variant="muted">Receive notifications via email</Text>
                    </Box>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
                    />
                  </Flex>

                  <Flex className="items-center justify-between">
                    <Box>
                      <Heading level={4} className="font-medium">Push Notifications</Heading>
                      <Text size="sm" variant="muted">Receive push notifications in your browser</Text>
                    </Box>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('pushNotifications', checked)}
                    />
                  </Flex>

                  <Separator />

                  <Flex className="items-center justify-between">
                    <Box>
                      <Heading level={4} className="font-medium">Project Updates</Heading>
                      <Text size="sm" variant="muted">Notifications about project status changes</Text>
                    </Box>
                    <Switch
                      checked={notifications.projectUpdates}
                      onCheckedChange={(checked) => handleNotificationToggle('projectUpdates', checked)}
                    />
                  </Flex>

                  <Flex className="items-center justify-between">
                    <Box>
                      <Heading level={4} className="font-medium">Task Assignments</Heading>
                      <Text size="sm" variant="muted">When you're assigned to a task</Text>
                    </Box>
                    <Switch
                      checked={notifications.taskAssignments}
                      onCheckedChange={(checked) => handleNotificationToggle('taskAssignments', checked)}
                    />
                  </Flex>

                  <Flex className="items-center justify-between">
                    <Box>
                      <Heading level={4} className="font-medium">Comments</Heading>
                      <Text size="sm" variant="muted">When someone comments on your tasks</Text>
                    </Box>
                    <Switch
                      checked={notifications.comments}
                      onCheckedChange={(checked) => handleNotificationToggle('comments', checked)}
                    />
                  </Flex>
                </VStack>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <VStack className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </VStack>

                <VStack className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </VStack>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Management
                </CardTitle>
                <CardDescription>
                  Manage your team members and their permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Flex className="items-center justify-center py-12">
                  <Box className="text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <Heading level={3} className="font-medium mb-2">Team Features</Heading>
                    <Text size="sm" variant="muted" className="mb-4">
                      Invite team members and collaborate on projects together.
                    </Text>
                    <Button>Invite Team Members</Button>
                  </Box>
                </Flex>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security and authentication.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <VStack className="space-y-4">
                  <Box>
                    <Heading level={4} className="font-medium mb-2">Change Password</Heading>
                    <VStack className="space-y-2">
                      <Input type="password" placeholder="Current password" />
                      <Input type="password" placeholder="New password" />
                      <Input type="password" placeholder="Confirm new password" />
                      <Button size="sm">Update Password</Button>
                    </VStack>
                  </Box>

                  <Separator />

                  <Box>
                    <Heading level={4} className="font-medium mb-2">Two-Factor Authentication</Heading>
                    <Text size="sm" variant="muted" className="mb-4">
                      Add an extra layer of security to your account.
                    </Text>
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4 mr-2" />
                      Enable 2FA
                    </Button>
                  </Box>
                </VStack>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Personal Access Tokens
                </CardTitle>
                <CardDescription>
                  Create and manage your personal access tokens.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Flex className="gap-2 items-end">
                  <VStack className="flex-1 space-y-2">
                    <Label>Token Name</Label>
                    <Input value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} />
                  </VStack>
                  <Button onClick={async () => {
                    try {
                      const { createToken } = await import('../api/tokens');
                      const res = await createToken(newTokenName || 'token');
                      // Показать разово plaintext токен
                      alert(`Token: ${res.token}`);
                      const { listTokens } = await import('../api/tokens');
                      const ts = await listTokens();
                      setTokens(ts.map(t => ({ id: t.id, name: t.name, created_at: t.created_at })));
                    } catch { }
                  }}>Create</Button>
                </Flex>

                <VStack className="space-y-2">
                  <Label>Existing Tokens</Label>
                  <VStack className="space-y-2">
                    {tokens.map(t => (
                      <Flex key={t.id} className="items-center justify-between border border-border rounded-lg p-3">
                        <Box>
                          <Text weight="medium">{t.name}</Text>
                          <Text size="xs" variant="muted">Created: {new Date(t.created_at).toLocaleString()}</Text>
                        </Box>
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            const { revokeToken } = await import('../api/tokens');
                            await revokeToken(t.id);
                            setTokens(tokens.filter(x => x.id !== t.id));
                          } catch { }
                        }}>Revoke</Button>
                      </Flex>
                    ))}
                    {tokens.length === 0 && <Text size="sm" variant="muted">No tokens yet.</Text>}
                  </VStack>
                </VStack>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Integrations
                </CardTitle>
                <CardDescription>
                  Connect NIGIt with your favorite tools and services.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Grid className="grid-cols-1 md:grid-cols-2 gap-4">
                  <Box className="p-4 border border-border rounded-lg">
                    <Flex className="items-center justify-between mb-2">
                      <Heading level={4} className="font-medium">GitHub</Heading>
                      <Button variant="outline" size="sm">Connect</Button>
                    </Flex>
                    <Text size="sm" variant="muted">
                      Sync repositories and branches with GitHub.
                    </Text>
                  </Box>

                  <Box className="p-4 border border-border rounded-lg">
                    <Flex className="items-center justify-between mb-2">
                      <Heading level={4} className="font-medium">Slack</Heading>
                      <Button variant="outline" size="sm">Connect</Button>
                    </Flex>
                    <Text size="sm" variant="muted">
                      Get notifications and updates in Slack.
                    </Text>
                  </Box>

                  <Box className="p-4 border border-border rounded-lg">
                    <Flex className="items-center justify-between mb-2">
                      <Heading level={4} className="font-medium">Figma</Heading>
                      <Button variant="outline" size="sm">Connect</Button>
                    </Flex>
                    <Text size="sm" variant="muted">
                      Import designs and sync with Figma files.
                    </Text>
                  </Box>

                  <Box className="p-4 border border-border rounded-lg">
                    <Flex className="items-center justify-between mb-2">
                      <Heading level={4} className="font-medium">Jira</Heading>
                      <Button variant="outline" size="sm">Connect</Button>
                    </Flex>
                    <Text size="sm" variant="muted">
                      Import issues and sync project data.
                    </Text>
                  </Box>
                </Grid>

                <Separator />

                <Box>
                  <Heading level={4} className="font-medium mb-4">Data Management</Heading>
                  <Flex className="gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </Button>
                  </Flex>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Box>
    </Flex>
  );
}