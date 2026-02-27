/**
 * Frontend-specific types for the Pipeline Kanban board.
 */

import type { Opportunity, StageWithOpportunities } from '@crm/types';

/** A stage column with locally tracked opportunities for optimistic UI */
export interface KanbanColumn extends StageWithOpportunities {
  opportunities: Opportunity[];
}

/** State for the board — keyed by stageId */
export type KanbanState = Record<string, KanbanColumn>;

export interface NewOpportunityFormData {
  title: string;
  contactId: string;
  value: number | null;
  closedAt: string;
  stageId: string;
  pipelineId: string;
}
