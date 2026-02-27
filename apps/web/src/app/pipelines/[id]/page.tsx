/**
 * /pipelines/[id] — Kanban board for a specific pipeline.
 */
'use client';

import * as React from 'react';
import { use } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@crm/ui';
import type { Opportunity } from '@crm/types';
import { getPipeline, moveOpportunityStage } from '@/lib/api';
import type { KanbanState } from '@/types/pipeline';
import { KanbanColumn } from '@/components/pipelines/kanban-column';
import { OpportunityCard } from '@/components/pipelines/opportunity-card';
import { NewOpportunitySheet } from '@/components/pipelines/new-opportunity-sheet';
import { OpportunityDetailSheet } from '@/components/pipelines/opportunity-detail-sheet';
import { ToastProvider, useToast } from '@/components/pipelines/toast';

interface PageProps {
  params: Promise<{ id: string }>;
}

function KanbanBoard({ pipelineId, onNameLoaded }: { pipelineId: string; onNameLoaded: (name: string) => void }) {
  const { toast } = useToast();
  const [pipelineName, setPipelineName] = React.useState('');
  const [columns, setColumns] = React.useState<KanbanState>({});
  const [stageOrder, setStageOrder] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activeOpportunity, setActiveOpportunity] = React.useState<Opportunity | null>(null);
  const activeDragSourceStage = React.useRef<string | null>(null);
  const [newOppStageId, setNewOppStageId] = React.useState<string>('');
  const [newOppOpen, setNewOppOpen] = React.useState(false);
  const [detailOpp, setDetailOpp] = React.useState<Opportunity | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const loadPipeline = React.useCallback(async () => {
    try {
      const data = await getPipeline(pipelineId);
      setPipelineName(data.name);
      onNameLoaded(data.name);
      const order = [...data.stages].sort((a, b) => a.order - b.order).map((s) => s.id);
      setStageOrder(order);
      const state: KanbanState = {};
      for (const stage of data.stages) {
        state[stage.id] = {
          ...stage,
          opportunities: stage.opportunities ?? [],
        };
      }
      setColumns(state);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load pipeline', 'error');
    } finally {
      setLoading(false);
    }
  }, [pipelineId, toast]);

  React.useEffect(() => { loadPipeline(); }, [loadPipeline]);

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const findStageForOpportunity = (opportunityId: string): string | null => {
    for (const [stageId, col] of Object.entries(columns)) {
      if (col.opportunities.some((o) => o.id === opportunityId)) return stageId;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const opp = active.data.current?.opportunity as Opportunity | undefined;
    if (opp) {
      setActiveOpportunity(opp);
      activeDragSourceStage.current = findStageForOpportunity(String(active.id));
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeStageId = findStageForOpportunity(activeId);
    const overStageId = columns[overId] ? overId : findStageForOpportunity(overId);

    if (!activeStageId || !overStageId || activeStageId === overStageId) return;

    setColumns((prev) => {
      const activeCol = prev[activeStageId];
      const overCol = prev[overStageId];
      if (!activeCol || !overCol) return prev;

      const activeOpp = activeCol.opportunities.find((o) => o.id === activeId);
      if (!activeOpp) return prev;

      return {
        ...prev,
        [activeStageId]: {
          ...activeCol,
          opportunities: activeCol.opportunities.filter((o) => o.id !== activeId),
        },
        [overStageId]: {
          ...overCol,
          opportunities: [...overCol.opportunities, { ...activeOpp, stageId: overStageId }],
        },
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOpportunity(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeStageId = findStageForOpportunity(activeId);
    const overStageId = columns[overId] ? overId : findStageForOpportunity(overId);

    if (!activeStageId || !overStageId) return;

    // Reorder within same column
    if (activeStageId === overStageId && activeId !== overId) {
      setColumns((prev) => {
        const col = prev[activeStageId];
        const oldIndex = col.opportunities.findIndex((o) => o.id === activeId);
        const newIndex = col.opportunities.findIndex((o) => o.id === overId);
        return {
          ...prev,
          [activeStageId]: {
            ...col,
            opportunities: arrayMove(col.opportunities, oldIndex, newIndex),
          },
        };
      });
    }

    // If moved to different stage, call API
    const sourceStageId = activeDragSourceStage.current;
    activeDragSourceStage.current = null;
    const opp = active.data.current?.opportunity as Opportunity | undefined;
    if (opp && overStageId && sourceStageId && sourceStageId !== overStageId) {
      // Snapshot for rollback (columns state already updated optimistically via DragOver)
      const snapshot = { ...columns };
      try {
        await moveOpportunityStage(activeId, overStageId);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to move opportunity', 'error');
        setColumns(snapshot);
      }
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddOpportunity = (stageId: string) => {
    setNewOppStageId(stageId);
    setNewOppOpen(true);
  };

  const handleOpportunityCreated = (opp: Opportunity) => {
    setColumns((prev) => {
      const col = prev[opp.stageId];
      if (!col) return prev;
      return { ...prev, [opp.stageId]: { ...col, opportunities: [...col.opportunities, opp] } };
    });
  };

  const handleOpportunityUpdated = (opp: Opportunity) => {
    setColumns((prev) => {
      const newState = { ...prev };
      // Remove from all columns, re-add to correct one
      for (const stageId of Object.keys(newState)) {
        newState[stageId] = {
          ...newState[stageId],
          opportunities: newState[stageId].opportunities.filter((o) => o.id !== opp.id),
        };
      }
      const col = newState[opp.stageId];
      if (col) {
        newState[opp.stageId] = { ...col, opportunities: [...col.opportunities, opp] };
      }
      return newState;
    });
    setDetailOpp(opp);
  };

  const stages = stageOrder.map((id) => columns[id]).filter(Boolean).map((col) => ({
    id: col.id,
    pipelineId: col.pipelineId,
    name: col.name,
    order: col.order,
    color: col.color,
  }));

  if (loading) {
    return (
      <div className="flex gap-4 p-6 overflow-x-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-72">
            <Skeleton className="h-16 w-full rounded-t-lg" />
            <div className="space-y-2 p-2 border border-t-0 border-border rounded-b-lg bg-muted/30">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 px-6 min-h-full">
          {stageOrder.map((stageId) => {
            const col = columns[stageId];
            if (!col) return null;
            return (
              <KanbanColumn
                key={stageId}
                stageId={stageId}
                name={col.name}
                color={col.color}
                opportunities={col.opportunities}
                onAddOpportunity={() => handleAddOpportunity(stageId)}
                onClickOpportunity={(opp) => { setDetailOpp(opp); setDetailOpen(true); }}
              />
            );
          })}

          {stageOrder.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-20">
              <div className="text-center">
                <p className="text-muted-foreground text-lg">No stages yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add stages via the API to get started</p>
              </div>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeOpportunity && (
            <OpportunityCard
              opportunity={activeOpportunity}
              onClick={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      <NewOpportunitySheet
        open={newOppOpen}
        onClose={() => setNewOppOpen(false)}
        pipelineId={pipelineId}
        stages={stages}
        defaultStageId={newOppStageId}
        onCreated={handleOpportunityCreated}
      />

      <OpportunityDetailSheet
        opportunity={detailOpp}
        stages={stages}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={handleOpportunityUpdated}
      />
    </>
  );
}

export default function PipelineBoardPage({ params }: PageProps) {
  const { id } = use(params);
  const [name, setName] = React.useState('Pipeline');

  return (
    <ToastProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <Link href="/pipelines" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to pipelines">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold">{name}</h1>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-hidden">
          <KanbanBoard pipelineId={id} onNameLoaded={setName} />
        </div>
      </div>
    </ToastProvider>
  );
}
