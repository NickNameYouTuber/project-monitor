import React from 'react';
import { GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Box, Flex, Heading, Text } from '@nicorp/nui';
import { motion } from 'framer-motion';
import { LoginButton } from '@niid/sdk/react';
import '@niid/sdk/styles';

export function AuthPage() {
  return (
    <Flex className="min-h-screen bg-background items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-primary/10 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -20, 30, 0],
            y: [0, 20, -30, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-primary/8 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 15, -15, 0],
            y: [0, -15, 15, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 rounded-full bg-violet-500/5 blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <Flex className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
            <GitBranch className="w-8 h-8 text-primary" />
          </Flex>
          <Heading level={1} className="text-3xl font-bold tracking-tight">NIGIt</Heading>
          <Text variant="muted" className="mt-1">Project management made simple</Text>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Welcome back</CardTitle>
              <CardDescription>
                Sign in to continue to your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <LoginButton
                clientId={import.meta.env.VITE_NIID_CLIENT_ID || 'WNG_42Met8abLocsiRQQ3Q'}
                ssoUrl={import.meta.env.VITE_NIID_SSO_URL || 'https://auth.id.nicorp.tech'}
                apiUrl={import.meta.env.VITE_NIID_API_URL || 'https://api.id.nicorp.tech'}
                redirectUri={window.location.origin + '/sso/niid/callback'}
                variant="primary"
                className="w-full"
                onSuccess={(user) => {
                  console.log('Login success:', user);
                  window.location.href = '/';
                }}
                onError={(error) => {
                  console.error('Login failed:', error);
                }}
              >
                Continue with NIID
              </LoginButton>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Text variant="muted" className="text-center text-xs mt-6">
            Secure authentication powered by NIID
          </Text>
        </motion.div>
      </motion.div>
    </Flex>
  );
}
