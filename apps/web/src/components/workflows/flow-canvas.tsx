/**
 * FlowCanvas — vertical linear flow canvas for workflow builder.
 * Supports drag-to-reorder via dnd-kit, trigger block, action blocks, branch sub-chains.
 */
'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@crm/ui';
import {
  Zap,
  Mail,
  MessageSquare,
  CheckSquare,
  FileText,
  UserCog,
  GitBranch,
  Webhook,
  Clock,
  ArrowRight,
  Plus,
  GripVertical,
  Trash2,
  Settings2,
} from 'lucide-react';
import type { Action, Trigger } from '@/types/workflow';
import { ActionType, TriggerEventType } from '@/types/workflow';

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  [ActionType.SendEmail]: Mail,
  [ActionType.SendSms]: MessageSquare,
  [ActionType.CreateTask]: CheckSquare,
  [ActionType.AddNote]: FileText,
  [ActionType.UpdateContact]: UserCog,
  [ActionType.MoveOpportunity]: ArrowRight,
  [ActionType.Webhook]: Webhook,
  [ActionType.Wait]: Clock,
  [ActionType.Branch]: GitBranch,
};

const ACTION_LABELS: Record<ActionType, string> = {
  [ActionType.SendEmail]: 'Send Email',
  [ActionType.SendSms]: 'Send SMS',
  [ActionType.CreateTask]: 'Create Task',
  [ActionType.AddNote]: 'Add Note',
  [ActionType.UpdateContact]: 'Update Contact',
  [ActionType.MoveOpportunity]: 'Move Opportunity',
  [ActionType.Webhook]: 'Webhook',
  [ActionType.Wait]: 'Wait',
  [ActionType.Branch]: 'Branch',
};

function getActionSummary(action: Action): string {
  const cfg = action.config as Record<string, unknown>;
  switch (action.type) {
    case ActionType.SendEmail: return cfg.subject ? `Subject: ${String(cfg.subject)}` : 'Email';
    case ActionType.SendSms: return cfg.to ? `To: ${String(cfg.to)}` : 'SMS';
    case ActionType.CreateTask: return cfg.title ? String(cfg.title) : 'Task';
    case ActionType.AddNote: return cfg.body ? String(cfg.body).substring(0, 40) + '…' : 'Note';
    case ActionType.UpdateContact: return 'Update fields';
    case ActionType.MoveOpportunity: return 'Move opportunity';
    case ActionType.Webhook: return cfg.url ? String(cfg.url).substring(0, 40) : 'Webhook';
    case ActionType.Wait: return `Wait ${cfg.amount ?? ''} ${cfg.unit ?? ''}`.trim();
    case ActionType.Branch: return cfg.expression ? String(cfg.expression).substring(0, 40) : 'Branch';
    default: return '';
  }
}

// ── Trigger Block ──

interface TriggerBlockProps {
  trigger: Trigger | null;
  onClick: () => void;
}

function TriggerBlock({ trigger, onClick }: TriggerBlockProps) {
  const eventLabel = trigger?.eventType
    ? trigger.eventType.replace(/\./g, ' › ')
    : 'No trigger set';

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-3 rounded-lg border-2 border-primary/40 bg-primary/5 px-4 py-3 cursor-pointer hover:border-primary hover:bg-primary/10 transition-colors"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
        <Zap size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Trigger</p>
        <p className="text-sm font-medium truncate">{eventLabel}</p>
        {trigger?.filters && trigger.filters.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {trigger.filters.map((f, i) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">
                {f.key}: {f.value}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Settings2 size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

// ── Add Action Button ──

function AddActionButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-center py-1">
      <div className="w-px h-4 bg-border" />
      <button
        onClick={onClick}
        className="mx-2 flex items-center justify-center w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <Plus size={12} className="text-muted-foreground hover:text-primary" />
      </button>
      <div className="w-px h-4 bg-border" />
    </div>
  );
}

// ── Sortable Action Block ──

interface ActionBlockProps {
  action: Action;
  onEdit: (action: Action) => void;
  onDelete: (actionId: string) => void;
  onAddAfter: (afterOrder: number, parentId?: string, branchPath?: 'true' | 'false') => void;
  childActions?: Action[];
}

function ActionBlock({ action, onEdit, onDelete, onAddAfter, childActions = [] }: ActionBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = ACTION_ICONS[action.type] ?? Zap;
  const summary = getActionSummary(action);
  const trueChildren = childActions.filter((c) => c.branchPath === 'true');
  const falseChildren = childActions.filter((c) => c.branchPath === 'false');

  return (
    <div ref={setNodeRef} style={style}>
      <div className="group relative flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary/50 transition-colors">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
          <Icon size={16} className="text-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{ACTION_LABELS[action.type]}</p>
            {action.condition && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 text-yellow-700 border-yellow-400 bg-yellow-50">
                If…
              </Badge>
            )}
            {action.delayAmount && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                ⏱ {action.delayAmount} {action.delayUnit}
              </Badge>
            )}
          </div>
          {summary && <p className="text-xs text-muted-foreground truncate mt-0.5">{summary}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(action)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            <Settings2 size={13} />
          </button>
          <button onClick={() => onDelete(action.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Branch sub-chains */}
      {action.type === ActionType.Branch && (
        <div className="mt-2 grid grid-cols-2 gap-3 pl-4">
          {/* True path */}
          <div className="border-l-2 border-green-400 pl-3 space-y-1">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
              {(action.config as { trueLabel?: string }).trueLabel ?? 'True'}
            </p>
            {trueChildren.map((child) => (
              <BranchChildBlock key={child.id} action={child} onEdit={onEdit} onDelete={onDelete} />
            ))}
            <AddActionButton onClick={() => onAddAfter(action.order, action.id, 'true')} />
          </div>

          {/* False path */}
          <div className="border-l-2 border-red-400 pl-3 space-y-1">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
              {(action.config as { falseLabel?: string }).falseLabel ?? 'False'}
            </p>
            {falseChildren.map((child) => (
              <BranchChildBlock key={child.id} action={child} onEdit={onEdit} onDelete={onDelete} />
            ))}
            <AddActionButton onClick={() => onAddAfter(action.order, action.id, 'false')} />
          </div>
        </div>
      )}
    </div>
  );
}

function BranchChildBlock({ action, onEdit, onDelete }: { action: Action; onEdit: (a: Action) => void; onDelete: (id: string) => void }) {
  const Icon = ACTION_ICONS[action.type] ?? Zap;
  const summary = getActionSummary(action);
  return (
    <div className="group flex items-center gap-2 rounded border bg-card px-3 py-2 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted shrink-0">
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{ACTION_LABELS[action.type]}</p>
        {summary && <p className="text-xs text-muted-foreground truncate">{summary}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(action)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Settings2 size={11} />
        </button>
        <button onClick={() => onDelete(action.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Main FlowCanvas ──

interface FlowCanvasProps {
  trigger: Trigger | null;
  actions: Action[];
  onTriggerClick: () => void;
  onActionEdit: (action: Action) => void;
  onActionDelete: (actionId: string) => void;
  onAddAction: (afterOrder?: number, parentId?: string, branchPath?: 'true' | 'false') => void;
  onReorder: (orderedIds: string[]) => void;
}

export function FlowCanvas({
  trigger,
  actions,
  onTriggerClick,
  onActionEdit,
  onActionDelete,
  onAddAction,
  onReorder,
}: FlowCanvasProps) {
  // Top-level actions (no parentActionId)
  const topLevelActions = React.useMemo(
    () => actions.filter((a) => !a.parentActionId).sort((a, b) => a.order - b.order),
    [actions],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = topLevelActions.findIndex((a) => a.id === active.id);
    const newIndex = topLevelActions.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(topLevelActions, oldIndex, newIndex);
    onReorder(reordered.map((a) => a.id));
  };

  return (
    <div className="flex flex-col gap-0 w-full max-w-xl mx-auto py-6">
      {/* Trigger */}
      <TriggerBlock trigger={trigger} onClick={onTriggerClick} />

      {/* Actions */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={topLevelActions.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {topLevelActions.map((action) => {
            const children = actions.filter((a) => a.parentActionId === action.id);
            return (
              <React.Fragment key={action.id}>
                <AddActionButton onClick={() => onAddAction(action.order - 0.5)} />
                <ActionBlock
                  action={action}
                  onEdit={onActionEdit}
                  onDelete={onActionDelete}
                  onAddAfter={onAddAction}
                  childActions={children}
                />
              </React.Fragment>
            );
          })}
        </SortableContext>
      </DndContext>

      {/* Add at end */}
      <AddActionButton onClick={() => onAddAction()} />
    </div>
  );
}
