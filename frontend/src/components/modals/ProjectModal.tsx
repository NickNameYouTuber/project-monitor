import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../utils/AppContext';
import type { ProjectStatus, ProjectPriority, DashboardMember } from '../../types';
import { 
  Modal, 
  TextInput, 
  Textarea, 
  Select, 
  Button, 
  Group, 
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId?: string;
  dashboardMembers?: DashboardMember[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, dashboardId, dashboardMembers = [] }) => {
  const { addProject, currentUser } = useAppContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('Team');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [status, setStatus] = useState<ProjectStatus>('inPlans');
  const [opened, { close }] = useDisclosure(false);

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setAssignee('Team');
      setPriority('medium');
      setStatus('inPlans');
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.token) return;
    
    // Используем dashboardId, если он передан
    const projectData = {
      name,
      description,
      assignee,
      priority,
      status,
      dashboard_id: dashboardId,
      order: 1000 // Добавляем поле order для новых проектов
    };
    
    addProject(projectData);
    onClose();
  };

  // Создаем данные для селектов
  const priorityData = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const statusData = [
    { value: 'inPlans', label: 'In Plans' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'onPause', label: 'On Pause' },
    { value: 'completed', label: 'Completed' }
  ];

  // Создаем данные для assignee
  const assigneeData = [
    { value: 'Team', label: 'Team' },
    ...(currentUser?.username ? [{ value: currentUser.username, label: 'You' }] : []),
    ...dashboardMembers
      .filter(member => member.user && member.user.username !== currentUser?.username)
      .map(member => ({ 
        value: member.user!.username, 
        label: member.user!.username 
      }))
  ];

  return (
    <Modal opened={opened} onClose={close} title="Authentication" centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Project Name"
            placeholder="Enter project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            data-autofocus
            radius="md"
          />
          <Textarea
            label="Description"
            placeholder="Enter project description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minRows={4}
            radius="md"
            required
          />
          <Select
            label="Assigned To"
            placeholder="Select assignee"
            data={assigneeData}
            value={assignee}
            onChange={(value) => setAssignee(value || 'Team')}
            radius="md"
          />
          <Select
            label="Priority"
            placeholder="Select priority"
            data={priorityData}
            value={priority}
            onChange={(value) => setPriority(value as ProjectPriority || 'medium')}
            radius="md"
          />
          <Select
            label="Status"
            placeholder="Select status"
            data={statusData}
            value={status}
            onChange={(value) => setStatus(value as ProjectStatus || 'inPlans')}
            radius="md"
          />
          <Group justify="flex-end" mt="md">
            <Button 
              variant="outline" 
              onClick={onClose}
              radius="md"
            >
              Cancel
            </Button>
            <Button 
              color="green" 
              type="submit"
              radius="md"
              variant="filled"
            >
              Add Project
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default ProjectModal;
