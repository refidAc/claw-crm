/**
 * Workflow Builder — two-panel layout with linear flow canvas.
 */
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { Badge } from '@crm/ui';
import { Switch } from '@crm/ui';
import { Skeleton } from '@crm/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@crm/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import {
  ArrowLeft,
  Plus,
  Loader2,
} from 'lucide-react';
import { ToastProvider, useToast } from '@/components/pipelines/toast';
import { FlowCanvas } from '@/components/workflows/flow-canvas';
import { TriggerConfigPanel } from '@/components/workflows/trigger-config-panel';
import { ActionConfigPanel } from '@/components/workflows/action-config-panel';
import { RunHistoryPanel } from '@/components/workflows/run-history-panel';
import {
  getWorkflow,
  updateWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  addTrigger,
  updateTrigger,
  addAction,
  updateAction,
  deleteAction,
  getPipelines,
} from '@/lib/api';
import type { WorkflowWithDetails, Action, Trigger, TriggerFilter, ActionConfig } from '@/types/workflow';
import { ActionType, TriggerEventType } from '@/types/workflow';
import type { Pipeline } from '@crm/types';

const ACTION_TYPE_OPTIONS: { value: ActionType; label: string }[] = [
  { value: ActionType.SendEmail, label: 'Send Email' },
  { value: ActionType.SendSms, label: 'Send SMS' },
  { value: ActionType.CreateTask, label: 'Create Task' },
  { value: ActionType.AddNote, label: 'Add Note' },
  { value: ActionType.UpdateContact, label: 'Update Contact' },
  { value: ActionType.MoveOpportunity, label: 'Move Opportunity' },
  { value: ActionType.Webhook, label: 'Webhook' },
  { value: ActionType.Wait, label: 'Wait' },
  { value: ActionType.Branch, label: 'Branch' },
];

function getDefaultConfig(type: ActionType): Record<string, unknown> {
  switch (type) {
    case ActionType.SendEmail: return { to: '', subject: '', body: '' };
    case ActionType.SendSms: return { to: '', body: '' };
    case ActionType.CreateTask: return { title: '', dueDateOffset: '+1 day' };
    case ActionType.AddNote: return { body: '' };
    case ActionType.UpdateContact: return { fields: [] };
    case ActionType.MoveOpportunity: return { pipelineId: '', stageId: '' };
    case ActionType.Webhook: return { url: '' };
    case ActionType.Wait: return { amount: 5, unit: 'minutes' };
    case ActionType.Branch: return { expression: '', trueLabel: 'True', falseLabel: 'False' };
    default: return {};
  }
}

function BuilderContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const workflowId = params.id;

  const [workflow, setWorkflow] = React.useState<WorkflowWithDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [toggling, setToggling] = React.useState(false);

  // Panels
  const [triggerPanelOpen, setTriggerPanelOpen] = React.useState(false);
  const [actionPanelOpen, setActionPanelOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] = React.useState<Action | null>(null);

  // Add action state
  const [addingAction, setAddingAction] = React.useState(false);
  const [selectedActionType, setSelectedActionType] = React.useState<ActionType>(ActionType.SendEmail);
  const [pendingInsertOrder, setPendingInsertOrder] = React.useState<number | undefined>();
  const [pendingParentId, setPendingParentId] = React.useState<string | undefined>();
  const [pendingBranchPath, setPendingBranchPath] = React.useState<'true' | 'false' | undefined>();

  React.useEffect(() => {
    Promise.all([
      getWorkflow(workflowId).then(setWorkflow).catch((e: Error) => toast(e.message, 'error')),
      getPipelines().then(setPipelines).catch(() => {}),
    ]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // ── Trigger save ──
  const handleTriggerSave = async (triggerId: string, eventType: TriggerEventType, filters: TriggerFilter[]) => {
    if (!workflow) return;
    try {
      const updated = await updateTrigger(workflowId, triggerId, { eventType, filters });
      setWorkflow((prev) => prev ? {
        ...prev,
        triggers: prev.triggers.map((t) => t.id === triggerId ? updated : t),
      } : prev);
      toast('Trigger saved', 'success');
    } catch (e) {
      // Trigger might not exist yet — create it
      try {
        const created = await addTrigger(workflowId, { eventType, filters });
        setWorkflow((prev) => prev ? { ...prev, triggers: [created] } : prev);
        toast('Trigger saved', 'success');
      } catch (e2) {
        toast((e2 as Error).message ?? 'Failed to save trigger', 'error');
      }
    }
  };

  // ── Action add ──
  const handleAddAction = async (afterOrder?: number, parentId?: string, branchPath?: 'true' | 'false') => {
    setPendingInsertOrder(afterOrder);
    setPendingParentId(parentId);
    setPendingBranchPath(branchPath);
    setAddingAction(true);
  };

  const confirmAddAction = async () => {
    if (!workflow) return;
    const topLevel = workflow.actions.filter((a) => !a.parentActionId);
    const order = pendingInsertOrder !== undefined
      ? pendingInsertOrder + 1
      : (topLevel.length > 0 ? Math.max(...topLevel.map((a) => a.order)) + 1 : 1);

    try {
      const action = await addAction(workflowId, {
        type: selectedActionType,
        order,
        config: getDefaultConfig(selectedActionType),
        parentActionId: pendingParentId,
        branchPath: pendingBranchPath,
      });
      setWorkflow((prev) => prev ? { ...prev, actions: [...prev.actions, action] } : prev);
      setAddingAction(false);
      // Open config panel for the new action
      setSelectedAction(action);
      setActionPanelOpen(true);
      toast('Action added', 'success');
    } catch (e) {
      toast((e as Error).message ?? 'Failed to add action', 'error');
    }
  };

  // ── Action save ──
  const handleActionSave = async (
    actionId: string,
    config: ActionConfig,
    condition: string | null,
    delayAmount: number | null,
    delayUnit: string | null,
  ) => {
    try {
      const updated = await updateAction(workflowId, actionId, {
        config: config as unknown as Record<string, unknown>,
        condition,
        delayAmount,
        delayUnit,
      });
      setWorkflow((prev) => prev ? {
        ...prev,
        actions: prev.actions.map((a) => a.id === actionId ? updated : a),
      } : prev);
      toast('Action saved', 'success');
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save action', 'error');
    }
  };

  // ── Action delete ──
  const handleActionDelete = async (actionId: string) => {
    try {
      await deleteAction(workflowId, actionId);
      setWorkflow((prev) => prev ? {
        ...prev,
        actions: prev.actions.filter((a) => a.id !== actionId && a.parentActionId !== actionId),
      } : prev);
      toast('Action deleted', 'success');
    } catch (e) {
      toast((e as Error).message ?? 'Failed to delete action', 'error');
    }
  };

  // ── Reorder ──
  const handleReorder = async (orderedIds: string[]) => {
    if (!workflow) return;
    // Optimistic update
    const updatedActions = workflow.actions.map((a) => {
      const idx = orderedIds.indexOf(a.id);
      return idx !== -1 ? { ...a, order: idx + 1 } : a;
    });
    setWorkflow((prev) => prev ? { ...prev, actions: updatedActions } : prev);

    // Persist each
    await Promise.all(
      orderedIds.map((id, idx) =>
        updateAction(workflowId, id, { order: idx + 1 }).catch(() => {}),
      ),
    );
  };

  // ── Toggle active ──
  const handleToggleActive = async () => {
    if (!workflow) return;
    setToggling(true);
    const wasActive = workflow.isActive;
    setWorkflow((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
    try {
      const updated = wasActive ? await deactivateWorkflow(workflowId) : await activateWorkflow(workflowId);
      setWorkflow((prev) => prev ? { ...prev, isActive: updated.isActive } : prev);
      toast(`Workflow ${updated.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch (e) {
      setWorkflow((prev) => prev ? { ...prev, isActive: wasActive } : prev);
      toast((e as Error).message ?? 'Failed to toggle workflow', 'error');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-64 border-r p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-16 w-full max-w-xl mx-auto" />
          <Skeleton className="h-16 w-full max-w-xl mx-auto" />
          <Skeleton className="h-16 w-full max-w-xl mx-auto" />
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Workflow not found.</p>
      </div>
    );
  }

  const trigger = workflow.triggers[0] ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r flex flex-col bg-card">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/workflows')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-semibold text-sm truncate flex-1">{workflow.name}</h2>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={workflow.isActive ? 'success' : 'secondary'}>
              {workflow.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Switch
              checked={workflow.isActive}
              onCheckedChange={handleToggleActive}
              disabled={toggling}
              aria-label="Toggle workflow active"
            />
          </div>
        </div>

        {/* Tabs: Steps / Runs */}
        <Tabs defaultValue="steps" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-3 mt-3 w-auto">
            <TabsTrigger value="steps" className="flex-1 text-xs">Steps</TabsTrigger>
            <TabsTrigger value="runs" className="flex-1 text-xs">Runs</TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Add action picker */}
            {addingAction ? (
              <div className="rounded-lg border bg-background p-3 space-y-3">
                <p className="text-xs font-semibold">Add Action</p>
                <Select value={selectedActionType} onValueChange={(v) => setSelectedActionType(v as ActionType)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={confirmAddAction}>Add</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingAction(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => handleAddAction()}
              >
                <Plus size={14} className="mr-1" /> Add Action
              </Button>
            )}

            {/* Stats */}
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <div className="flex justify-between">
                <span>Triggers</span><span>{workflow.triggers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Actions</span><span>{workflow.actions.length}</span>
              </div>
              {workflow._count && (
                <div className="flex justify-between">
                  <span>Total runs</span><span>{workflow._count.runs}</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="runs" className="flex-1 overflow-y-auto">
            <RunHistoryPanel workflowId={workflowId} />
          </TabsContent>
        </Tabs>
      </aside>

      {/* Main canvas */}
      <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
        <FlowCanvas
          trigger={trigger}
          actions={workflow.actions}
          onTriggerClick={() => {
            if (!trigger) {
              // Create a default trigger first
              addTrigger(workflowId, { eventType: TriggerEventType.ContactCreated, filters: [] })
                .then((t) => {
                  setWorkflow((prev) => prev ? { ...prev, triggers: [t] } : prev);
                  setTriggerPanelOpen(true);
                })
                .catch((e: Error) => toast(e.message, 'error'));
            } else {
              setTriggerPanelOpen(true);
            }
          }}
          onActionEdit={(action) => {
            setSelectedAction(action);
            setActionPanelOpen(true);
          }}
          onActionDelete={handleActionDelete}
          onAddAction={handleAddAction}
          onReorder={handleReorder}
        />
      </main>

      {/* Trigger panel */}
      <TriggerConfigPanel
        trigger={trigger}
        open={triggerPanelOpen}
        onClose={() => setTriggerPanelOpen(false)}
        onSave={handleTriggerSave}
      />

      {/* Action config panel */}
      <ActionConfigPanel
        action={selectedAction}
        open={actionPanelOpen}
        onClose={() => { setActionPanelOpen(false); setSelectedAction(null); }}
        onSave={handleActionSave}
        pipelines={pipelines}
      />
    </div>
  );
}

export default function WorkflowBuilderPage() {
  return (
    <ToastProvider>
      <BuilderContent />
    </ToastProvider>
  );
}
