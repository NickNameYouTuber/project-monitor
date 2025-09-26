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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { LoadingSpinner } from './loading-spinner';

export function SettingsPage() {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
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
    (async () => {
      try {
        setIsLoading(true);
        const { getCurrentUser } = await import('../api/users');
        const me = await getCurrentUser();
        setProfile((prev) => ({
          ...prev,
          name: me.displayName || me.username,
          email: me.username,
        }));
        const { listTokens } = await import('../api/tokens');
        const ts = await listTokens();
        setTokens(ts.map(t => ({ id: t.id, name: t.name, created_at: t.created_at })));
      } catch {}
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

  if (isLoading) {
    return <LoadingSpinner 
      stages={['Auth User', 'Load Profile', 'Fetch Tokens', 'Ready']}
    />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div>
          <h1>Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
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
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="text-xl">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">Change Avatar</Button>
                    <Button variant="ghost" size="sm">Remove</Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => handleProfileUpdate('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleProfileUpdate('email', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
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
                </div>
                
                <Button onClick={async () => {
                  try {
                    const { updateCurrentUser } = await import('../api/users');
                    await updateCurrentUser({ displayName: profile.name, username: profile.email });
                  } catch {}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Push Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('pushNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Project Updates</h4>
                      <p className="text-sm text-muted-foreground">Notifications about project status changes</p>
                    </div>
                    <Switch
                      checked={notifications.projectUpdates}
                      onCheckedChange={(checked) => handleNotificationToggle('projectUpdates', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Task Assignments</h4>
                      <p className="text-sm text-muted-foreground">When you're assigned to a task</p>
                    </div>
                    <Switch
                      checked={notifications.taskAssignments}
                      onCheckedChange={(checked) => handleNotificationToggle('taskAssignments', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Comments</h4>
                      <p className="text-sm text-muted-foreground">When someone comments on your tasks</p>
                    </div>
                    <Switch
                      checked={notifications.comments}
                      onCheckedChange={(checked) => handleNotificationToggle('comments', checked)}
                    />
                  </div>
                </div>
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
                <div className="space-y-2">
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
                </div>
                
                <div className="space-y-2">
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
                </div>
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
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Team Features</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Invite team members and collaborate on projects together.
                    </p>
                    <Button>Invite Team Members</Button>
                  </div>
                </div>
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
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Change Password</h4>
                    <div className="space-y-2">
                      <Input type="password" placeholder="Current password" />
                      <Input type="password" placeholder="New password" />
                      <Input type="password" placeholder="Confirm new password" />
                      <Button size="sm">Update Password</Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add an extra layer of security to your account.
                    </p>
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4 mr-2" />
                      Enable 2FA
                    </Button>
                  </div>
                </div>
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
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Token Name</Label>
                    <Input value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} />
                  </div>
                  <Button onClick={async () => {
                    try {
                      const { createToken } = await import('../api/tokens');
                      const res = await createToken(newTokenName || 'token');
                      // Показать разово plaintext токен
                      alert(`Token: ${res.token}`);
                      const { listTokens } = await import('../api/tokens');
                      const ts = await listTokens();
                      setTokens(ts.map(t => ({ id: t.id, name: t.name, created_at: t.created_at })));
                    } catch {}
                  }}>Create</Button>
                </div>

                <div className="space-y-2">
                  <Label>Existing Tokens</Label>
                  <div className="space-y-2">
                    {tokens.map(t => (
                      <div key={t.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">Created: {new Date(t.created_at).toLocaleString()}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            const { revokeToken } = await import('../api/tokens');
                            await revokeToken(t.id);
                            setTokens(tokens.filter(x => x.id !== t.id));
                          } catch {}
                        }}>Revoke</Button>
                      </div>
                    ))}
                    {tokens.length === 0 && <div className="text-sm text-muted-foreground">No tokens yet.</div>}
                  </div>
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">GitHub</h4>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sync repositories and branches with GitHub.
                    </p>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Slack</h4>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get notifications and updates in Slack.
                    </p>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Figma</h4>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Import designs and sync with Figma files.
                    </p>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Jira</h4>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Import issues and sync project data.
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-4">Data Management</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}