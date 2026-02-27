/**
 * API client — thin fetch wrapper for the NestJS backend.
 * Reads NEXT_PUBLIC_API_URL from env, attaches auth token from cookie/localStorage.
 */

import type {
  Pipeline,
  PipelineWithStagesAndOpportunities,
  Opportunity,
  Contact,
  Note,
  ActivityEvent,
} from '@crm/types';

import type {
  Workflow,
  WorkflowWithDetails,
  Trigger,
  Action,
  JobRun,
} from '@/types/workflow';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('crm_token');
}

export function setToken(token: string) {
  localStorage.setItem('crm_token', token);
}

export function clearToken() {
  localStorage.removeItem('crm_token');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err?.error?.message ?? err?.error ?? 'Request failed');
  }

  const body = await res.json() as { data: T };
  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ── Pipeline helpers ──────────────────────────────────────────────────────────

export function getPipelines(): Promise<Pipeline[]> {
  return api.get<Pipeline[]>('/pipelines');
}

export function getPipeline(id: string): Promise<PipelineWithStagesAndOpportunities> {
  return api.get<PipelineWithStagesAndOpportunities>(`/pipelines/${id}`);
}

export function createPipeline(data: { name: string; stages?: { name: string; order: number; color?: string }[] }): Promise<Pipeline> {
  return api.post<Pipeline>('/pipelines', data);
}

// ── Opportunity helpers ───────────────────────────────────────────────────────

export function getOpportunities(pipelineId: string): Promise<Opportunity[]> {
  return api.get<Opportunity[]>(`/opportunities?pipelineId=${pipelineId}`);
}

export function getOpportunity(id: string): Promise<Opportunity> {
  return api.get<Opportunity>(`/opportunities/${id}`);
}

export function createOpportunity(data: {
  contactId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value?: number | null;
  closedAt?: string | null;
}): Promise<Opportunity> {
  return api.post<Opportunity>('/opportunities', data);
}

export function updateOpportunity(id: string, data: Partial<{
  title: string;
  value: number | null;
  status: string;
  closedAt: string | null;
  stageId: string;
}>): Promise<Opportunity> {
  return api.put<Opportunity>(`/opportunities/${id}`, data);
}

export function moveOpportunityStage(id: string, stageId: string): Promise<Opportunity> {
  return api.put<Opportunity>(`/opportunities/${id}/stage/${stageId}`, {});
}

// ── Notes helpers ─────────────────────────────────────────────────────────────

export function getOpportunityNotes(opportunityId: string): Promise<Note[]> {
  return api.get<Note[]>(`/notes?opportunityId=${opportunityId}`);
}

export function createNote(data: { opportunityId: string; body: string }): Promise<Note> {
  return api.post<Note>('/notes', data);
}

// ── Activity helpers ──────────────────────────────────────────────────────────

export function getActivityEvents(entityId: string): Promise<ActivityEvent[]> {
  return api.get<ActivityEvent[]>(`/activity?entityId=${entityId}`);
}

// ── Contact helpers ───────────────────────────────────────────────────────────

export function getContacts(search?: string): Promise<Contact[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return api.get<Contact[]>(`/contacts${q}`);
}


// ── Workflow helpers ──────────────────────────────────────────────────────────

export function getWorkflows(): Promise<Workflow[]> {
  return api.get<Workflow[]>('/workflows');
}

export function getWorkflow(id: string): Promise<WorkflowWithDetails> {
  return api.get<WorkflowWithDetails>(`/workflows/${id}`);
}

export function createWorkflow(data: { name: string; description?: string }): Promise<Workflow> {
  return api.post<Workflow>('/workflows', data);
}

export function updateWorkflow(id: string, data: Partial<{ name: string; description: string; isActive: boolean }>): Promise<Workflow> {
  return api.patch<Workflow>(`/workflows/${id}`, data);
}

export function deleteWorkflow(id: string): Promise<void> {
  return api.delete<void>(`/workflows/${id}`);
}

export function activateWorkflow(id: string): Promise<Workflow> {
  return api.post<Workflow>(`/workflows/${id}/activate`, {});
}

export function deactivateWorkflow(id: string): Promise<Workflow> {
  return api.post<Workflow>(`/workflows/${id}/deactivate`, {});
}

export function addTrigger(workflowId: string, data: { eventType: string; filters?: { key: string; value: string }[] }): Promise<Trigger> {
  return api.post<Trigger>(`/workflows/${workflowId}/triggers`, data);
}

export function updateTrigger(workflowId: string, triggerId: string, data: { eventType?: string; filters?: { key: string; value: string }[] }): Promise<Trigger> {
  return api.put<Trigger>(`/workflows/${workflowId}/triggers/${triggerId}`, data);
}

export function deleteTrigger(workflowId: string, triggerId: string): Promise<void> {
  return api.delete<void>(`/workflows/${workflowId}/triggers/${triggerId}`);
}

export function addAction(workflowId: string, data: { type: string; order?: number; config: Record<string, unknown>; condition?: string; delayAmount?: number; delayUnit?: string; parentActionId?: string; branchPath?: string }): Promise<Action> {
  return api.post<Action>(`/workflows/${workflowId}/actions`, data);
}

export function updateAction(workflowId: string, actionId: string, data: Partial<{ type: string; order: number; config: Record<string, unknown>; condition: string | null; delayAmount: number | null; delayUnit: string | null }>): Promise<Action> {
  return api.patch<Action>(`/workflows/${workflowId}/actions/${actionId}`, data);
}

export function deleteAction(workflowId: string, actionId: string): Promise<void> {
  return api.delete<void>(`/workflows/${workflowId}/actions/${actionId}`);
}

export function getWorkflowRuns(workflowId: string, cursor?: string): Promise<JobRun[]> {
  const q = cursor ? `?cursor=${cursor}` : '';
  return api.get<JobRun[]>(`/workflows/${workflowId}/runs${q}`);
}
