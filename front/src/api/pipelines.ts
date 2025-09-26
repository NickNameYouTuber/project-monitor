import { apiClient } from './client';

export type PipelineDto = { id: string; status?: string };

export async function triggerPipeline(body: any): Promise<PipelineDto> {
  const { data } = await apiClient.post<PipelineDto>('/pipelines/trigger', body);
  return data;
}

export async function cancelPipeline(pipelineId: string): Promise<void> {
  await apiClient.post(`/pipelines/${pipelineId}/cancel`, {});
}

export async function getJobLogs(jobId: string): Promise<string> {
  const { data } = await apiClient.get(`/pipelines/jobs/${jobId}/logs`, { responseType: 'text' });
  return data as unknown as string;
}

export async function startManualJob(jobId: string): Promise<any> {
  const { data } = await apiClient.post(`/pipelines/jobs/${jobId}/start`, {});
  return data;
}


