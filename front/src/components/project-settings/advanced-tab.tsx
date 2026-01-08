import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';

interface AdvancedTabProps {
    project: any;
}

export function AdvancedTab({ project }: AdvancedTabProps) {
    return (
        <div className="space-y-6">
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
                    <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-background/50">
                        <div>
                            <h4 className="font-medium text-foreground">Delete Project</h4>
                            <p className="text-sm text-muted-foreground">
                                Permanently remove this project and all its data.
                            </p>
                        </div>
                        <Button variant="destructive">Delete Project</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
