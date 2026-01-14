import React from 'react';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
    Input, Label, Button, Textarea, Badge,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Box, Flex, VStack, Grid, Heading, Text
} from '@nicorp/nui';
import { Project } from '../../App';

interface GeneralTabProps {
    project: Project;
    permissions?: any;
    onUpdate?: (project: Project) => void;
}

export function GeneralTab({ project, permissions, onUpdate }: GeneralTabProps) {
    return (
        <VStack className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Manage your project's core information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <VStack className="gap-2">
                        <Label htmlFor="title">Project Name</Label>
                        <Input id="title" defaultValue={project.title} />
                    </VStack>
                    <VStack className="gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" defaultValue={project.description} />
                    </VStack>
                    <Grid className="grid-cols-2 gap-4">
                        <VStack className="gap-2">
                            <Label>Status</Label>
                            <Select defaultValue={project.status || 'active'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </VStack>
                        <VStack className="gap-2">
                            <Label>Color</Label>
                            <Flex className="items-center gap-2">
                                <Box className={`w-8 h-8 rounded-full ${project.color || 'bg-blue-500'}`} />
                                <Input defaultValue={project.color || 'bg-blue-500'} className="font-mono text-xs" />
                            </Flex>
                        </VStack>
                    </Grid>
                </CardContent>
                <Flex className="px-6 py-4 border-t justify-end">
                    <Button>Save Changes</Button>
                </Flex>
            </Card>
        </VStack>
    );
}
