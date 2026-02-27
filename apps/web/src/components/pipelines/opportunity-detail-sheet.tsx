/**
 * OpportunityDetailSheet — slide-over panel showing full opportunity details.
 */
'use client';

import * as React from 'react';
import { SlideOver, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Label, Skeleton } from '@crm/ui';
import type { Opportunity, Note, ActivityEvent, Stage } from '@crm/types';
import { updateOpportunity, moveOpportunityStage, getOpportunityNotes, createNote, getActivityEvents } from '@/lib/api';
import { useToast } from './toast';
import { formatDistanceToNow } from './date-utils';

interface OpportunityDetailSheetProps {
  opportunity: Opportunity | null;
  stages: Stage[];
  open: boolean;
  onClose: () => void;
  onUpdated: (opp: Opportunity) => void;
}

export function OpportunityDetailSheet({
  opportunity,
  stages,
  open,
  onClose,
  onUpdated,
}: OpportunityDetailSheetProps) {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [activities, setActivities] = React.useState<ActivityEvent[]>([]);
  const [noteBody, setNoteBody] = React.useState('');
  const [loadingNotes, setLoadingNotes] = React.useState(false);
  const [loadingActivity, setLoadingActivity] = React.useState(false);
  const [savingNote, setSavingNote] = React.useState(false);
  const [movingStage, setMovingStage] = React.useState(false);

  React.useEffect(() => {
    if (!opportunity || !open) return;
    setLoadingNotes(true);
    setLoadingActivity(true);

    getOpportunityNotes(opportunity.id)
      .then(setNotes)
      .catch(() => {/* notes might not exist yet */})
      .finally(() => setLoadingNotes(false));

    getActivityEvents(opportunity.id)
      .then(setActivities)
      .catch(() => {/* silently handle */})
      .finally(() => setLoadingActivity(false));
  }, [opportunity?.id, open]);

  if (!opportunity) return null;

  const contactName = opportunity.contact
    ? `${opportunity.contact.firstName} ${opportunity.contact.lastName}`
    : '—';

  const formattedValue = opportunity.value != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(String(opportunity.value)))
    : '—';

  const handleMoveStage = async (stageId: string) => {
    if (stageId === opportunity.stageId) return;
    setMovingStage(true);
    try {
      const updated = await moveOpportunityStage(opportunity.id, stageId);
      onUpdated(updated);
      toast('Moved to new stage', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to move stage', 'error');
    } finally {
      setMovingStage(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setSavingNote(true);
    try {
      const note = await createNote({ opportunityId: opportunity.id, body: noteBody });
      setNotes((prev) => [note, ...prev]);
      setNoteBody('');
      toast('Note added', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const updated = await updateOpportunity(opportunity.id, { status });
      onUpdated(updated);
      toast('Status updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={opportunity.title}
      description={`Contact: ${contactName}`}
      width="max-w-xl"
    >
      <div className="space-y-6">
        {/* Details grid */}
        <section className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Contact</p>
            <p className="text-sm font-medium">{contactName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Value</p>
            <p className="text-sm font-medium">{formattedValue}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Close Date</p>
            <p className="text-sm">{opportunity.closedAt ? new Date(opportunity.closedAt).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created</p>
            <p className="text-sm">{formatDistanceToNow(opportunity.createdAt)}</p>
          </div>
        </section>

        {/* Status */}
        <section className="space-y-2">
          <Label>Status</Label>
          <Select value={opportunity.status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="won">Won 🎉</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Move stage */}
        <section className="space-y-2">
          <Label>Move to Stage</Label>
          <Select value={opportunity.stageId} onValueChange={handleMoveStage} disabled={movingStage}>
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Notes</h3>
          <form onSubmit={handleAddNote} className="space-y-2">
            <Textarea
              placeholder="Add a note…"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={2}
            />
            <Button type="submit" size="sm" disabled={savingNote || !noteBody.trim()}>
              {savingNote ? 'Saving…' : 'Add Note'}
            </Button>
          </form>

          {loadingNotes ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No notes yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="p-3 bg-muted/40 rounded-md border border-border/50">
                  <p className="text-sm">{note.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {note.author ? `${note.author.firstName} ${note.author.lastName} · ` : ''}
                    {formatDistanceToNow(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Activity timeline */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Activity</h3>
          {loadingActivity ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No activity yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activities.map((event) => (
                <div key={event.id} className="flex gap-2 text-xs">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <span className="font-medium">{event.eventType.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground ml-2">{formatDistanceToNow(event.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </SlideOver>
  );
}
