import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Box, Flex, VStack, Heading, Text } from '@nicorp/nui';
import { AlertTriangle } from 'lucide-react';

interface AdvancedTabProps {
    project: any;
    permissions?: any;
}

export function AdvancedTab({ project }: AdvancedTabProps) {
    return (
        <VStack className="space-y-6">
            <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Irreversible actions for this project.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Flex className="items-center justify-between p-4 border border-destructive/20 rounded-lg bg-background/50">
                        <Box>
                            <Heading level={5} className="font-medium text-foreground">Delete Project</Heading>
                            <Text size="sm" variant="muted">
                                Permanently remove this project and all its data.
                            </Text>
                        </Box>
                        <Button variant="destructive">Delete Project</Button>
                    </Flex>
                </CardContent>
            </Card>
        </VStack>
    );
}
