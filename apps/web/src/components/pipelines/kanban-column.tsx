/**
 * KanbanColumn — droppable column for a pipeline stage.
 */
'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn, Button } from '@crm/ui';
import type { Opportunity } from '@crm/types';
import { OpportunityCard, OpportunityCardSkeleton } from './opportunity-card';

interface KanbanColumnProps {
  stageId: string;
  name: string;
  color: string;
  opportunities: Opportunity[];
  onAddOpportunity: () => void;
  onClickOpportunity: (opportunity: Opportunity) => void;
  isLoading?: boolean;
}

function formatCurrency(total: number): string {
  if (total === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: total >= 1_000_000 ? 'compact' : 'standard',
  }).format(total);
}

export function KanbanColumn({
  stageId,
  name,
  color,
  opportunities,
  onAddOpportunity,
  onClickOpportunity,
  isLoading = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  const totalValue = opportunities.reduce((sum, o) => {
    const v = o.value != null ? parseFloat(String(o.value)) : 0;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const opportunityIds = opportunities.map((o) => o.id);

  return (
    <div className="flex flex-col shrink-0 w-72">
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-t-lg border border-b-0 border-border"
        style={{ backgroundColor: `${color}18`, borderTop: `3px solid ${color}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{name}</span>
            <span
              className="inline-flex items-center justify-center rounded-full text-xs font-medium px-1.5 py-0.5 min-w-[1.25rem]"
              style={{ backgroundColor: `${color}30`, color }}
            >
              {opportunities.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalValue)}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
          onClick={onAddOpportunity}
          aria-label={`Add opportunity to ${name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[8rem] flex flex-col gap-2 p-2 rounded-b-lg border border-t-0 border-border bg-muted/30 transition-colors',
          isOver && 'bg-primary/5 border-primary/30',
        )}
      >
        {isLoading ? (
          <>
            <OpportunityCardSkeleton />
            <OpportunityCardSkeleton />
          </>
        ) : (
          <SortableContext items={opportunityIds} strategy={verticalListSortingStrategy}>
            {opportunities.length === 0 ? (
              <div
                className={cn(
                  'flex flex-col items-center justify-center py-8 text-center rounded-md border-2 border-dashed border-border/50 transition-colors',
                  isOver && 'border-primary/40 bg-primary/5',
                )}
              >
                <p className="text-xs text-muted-foreground">Drop here or</p>
                <button
                  onClick={onAddOpportunity}
                  className="text-xs text-primary hover:underline mt-1"
                  aria-label={`Add first opportunity to ${name}`}
                >
                  add an opportunity
                </button>
              </div>
            ) : (
              opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onClick={() => onClickOpportunity(opp)}
                />
              ))
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
