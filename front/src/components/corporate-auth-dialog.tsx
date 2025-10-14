import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { linkCorporateAccount } from '../api/corporate-auth';
import { Building2 } from 'lucide-react';

interface CorporateAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  onSuccess: () => void;
}

export function CorporateAuthDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  onSuccess
}: CorporateAuthDialogProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const result = await linkCorporateAccount(
        organizationId,
        email,
        username || undefined,
        password
      );
      
      if (result.success) {
        toast.success('Corporate account linked successfully');
        setEmail('');
        setUsername('');
        setPassword('');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to link corporate account');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to link corporate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Corporate Account Required</DialogTitle>
              <DialogDescription className="text-xs">{organizationName}</DialogDescription>
            </div>
          </div>
          <DialogDescription>
            This organization requires a corporate account. Please enter your corporate credentials to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="corporate-email">Corporate Email</Label>
            <Input
              id="corporate-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="corporate-username">Username (optional)</Label>
            <Input
              id="corporate-username"
              type="text"
              placeholder="john.doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="corporate-password">Password</Label>
            <Input
              id="corporate-password"
              type="password"
              placeholder="Enter your corporate password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
          >
            {loading ? 'Linking...' : 'Link Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

