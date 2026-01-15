import React from 'react';
import { Button, Box, Flex, Heading, Text } from '@nicorp/nui';
import { Plus } from 'lucide-react';

export default function CallsHeader({ onOpenNew }: { onOpenNew: () => void }) {
  return (
    <Flex className="items-center justify-between mb-4">
      <Box>
        <Heading level={1}>Calls & Meetings</Heading>
        <Text className="text-muted-foreground">Schedule and manage your team meetings</Text>
      </Box>
      <Button onClick={onOpenNew}>
        <Plus className="w-4 h-4 mr-2" />
        New Meeting
      </Button>
    </Flex>
  );
}


