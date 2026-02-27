/**
 * Domain model types shared across the CRM monorepo.
 * These mirror the Prisma schema for use on the frontend.
 */

import { OpportunityStatus } from './enums';

export interface Contact {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string;
  opportunities?: Opportunity[];
}

export interface Pipeline {
  id: string;
  accountId: string;
  name: string;
  createdAt: string;
  stages?: Stage[];
  opportunities?: Opportunity[];
  _count?: {
    stages: number;
    opportunities: number;
  };
}

export interface PipelineWithStagesAndOpportunities extends Pipeline {
  stages: StageWithOpportunities[];
}

export interface StageWithOpportunities extends Stage {
  opportunities: Opportunity[];
}

export interface Opportunity {
  id: string;
  accountId: string;
  contactId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value?: string | number | null;
  status: OpportunityStatus | string;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  stage?: Stage;
}

export interface Note {
  id: string;
  accountId: string;
  contactId?: string | null;
  opportunityId?: string | null;
  body: string;
  createdAt: string;
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ActivityEvent {
  id: string;
  accountId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
