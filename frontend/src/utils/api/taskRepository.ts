import axios from 'axios';
import { API_BASE_URL } from '../api';

export interface TaskBranch {
  repositoryId: string;
  repositoryName: string;
  branchName: string;
  created_at: string;
}

const getTaskBranches = async (taskId: string, token: string): Promise<TaskBranch[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/task-repository/${taskId}/branches`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching task branches:', error);
    return [];
  }
};

export default {
  getTaskBranches
};
