/**
 * OpportunityCard — draggable kanban card.
 */
'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, DollarSign, Clock, User } from 'lucide-react';
import { cn } from '@crm/ui';
import type { Opportunity } from '@crm/types';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  isDragOverlay?: boolean;
}

function getDaysInStage(updatedAt: string): number {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

export function OpportunityCard({ opportunity, onClick, isDragOverlay = false }: OpportunityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opportunity.id,
    data: { type: 'opportunity', opportunity },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contactName = opportunity.contact
    ? `${opportunity.contact.firstName} ${opportunity.contact.lastName}`
    : '—';

  const days = getDaysInStage(opportunity.updatedAt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border border-border rounded-lg p-3 shadow-sm cursor-pointer group',
        'hover:border-primary/40 hover:shadow-md transition-all',
        isDragging && 'opacity-40 scale-95',
        isDragOverlay && 'shadow-xl rotate-1 border-primary/60',
      )}
      onClick={onClick}
      aria-label={`Opportunity: ${opportunity.title}`}
    >
      {/* Drag handle */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground"
          aria-label="Drag to reorder opportunity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm font-medium text-foreground truncate">{opportunity.title}</p>

          {/* Contact */}
          <div className="flex items-center gap-1 mt-1">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{contactName}</span>
          </div>

          {/* Footer: value + days */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{formatCurrency(opportunity.value)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className={cn('text-xs', days > 14 ? 'text-orange-500 font-medium' : 'text-muted-foreground')}>
                {days}d
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Non-draggable skeleton placeholder */
export function OpportunityCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted rounded w-1/2 mb-3" />
      <div className="flex justify-between">
        <div className="h-3 bg-muted rounded w-1/4" />
        <div className="h-3 bg-muted rounded w-1/5" />
      </div>
    </div>
  );
}
