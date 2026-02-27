/**
 * @crm/db — re-exports PrismaClient for use across the monorepo.
 * Import from this package instead of @prisma/client directly so the
 * client path is always resolved from this package's generated output.
 */
export { PrismaClient, Prisma } from '@prisma/client';
export type {
  Account,
  User,
  Session,
  Role,
  Permission,
  Contact,
  Company,
  Pipeline,
  Stage,
  Opportunity,
  Conversation,
  Message,
  ChannelIdentity,
  Task,
  Note,
  ActivityEvent,
  WorkflowDefinition,
  Trigger,
  Action,
  Condition,
  Delay,
  Job,
  JobRun,
} from '@prisma/client';
