/**
 * TriggerConfigPanel — slide-over for configuring a workflow trigger.
 */
'use client';

import * as React from 'react';
import { SlideOver } from '@crm/ui';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Label } from '@crm/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { Trigger, TriggerFilter } from '@/types/workflow';
import { TriggerEventType } from '@/types/workflow';

const EVENT_TYPE_LABELS: Record<TriggerEventType, string> = {
  [TriggerEventType.ContactCreated]: 'Contact Created',
  [TriggerEventType.ContactUpdated]: 'Contact Updated',
  [TriggerEventType.ContactDeleted]: 'Contact Deleted',
  [TriggerEventType.OpportunityCreated]: 'Opportunity Created',
  [TriggerEventType.OpportunityStageChanged]: 'Opportunity Stage Changed',
  [TriggerEventType.OpportunityClosed]: 'Opportunity Closed',
  [TriggerEventType.MessageReceived]: 'Message Received',
  [TriggerEventType.MessageSent]: 'Message Sent',
  [TriggerEventType.ConversationCreated]: 'Conversation Created',
  [TriggerEventType.WorkflowTriggered]: 'Workflow Triggered',
  [TriggerEventType.JobCompleted]: 'Job Completed',
  [TriggerEventType.JobFailed]: 'Job Failed',
};

interface TriggerConfigPanelProps {
  trigger: Trigger | null;
  open: boolean;
  onClose: () => void;
  onSave: (triggerId: string, eventType: TriggerEventType, filters: TriggerFilter[]) => void;
}

export function TriggerConfigPanel({ trigger, open, onClose, onSave }: TriggerConfigPanelProps) {
  const [eventType, setEventType] = React.useState<TriggerEventType>(TriggerEventType.ContactCreated);
  const [filters, setFilters] = React.useState<TriggerFilter[]>([]);

  React.useEffect(() => {
    if (trigger) {
      setEventType(trigger.eventType);
      setFilters(trigger.filters ?? []);
    }
  }, [trigger]);

  if (!trigger) return null;

  const handleSave = () => {
    onSave(trigger.id, eventType, filters);
    onClose();
  };

  const updateFilter = (i: number, key: keyof TriggerFilter, val: string) => {
    setFilters((prev) => {
      const next = [...prev];
      next[i] = { ...next[i]!, [key]: val };
      return next;
    });
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Configure Trigger">
      <div className="flex flex-col gap-6 p-6 overflow-y-auto">
        {/* Event type */}
        <div className="space-y-1">
          <Label>Event Type</Label>
          <Select value={eventType} onValueChange={(v) => setEventType(v as TriggerEventType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Filters</Label>
            <button
              onClick={() => setFilters((prev) => [...prev, { key: '', value: '' }])}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add filter
            </button>
          </div>

          {filters.length === 0 && (
            <p className="text-xs text-muted-foreground">No filters — trigger fires on every matching event.</p>
          )}

          {filters.map((f, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={f.key}
                onChange={(e) => updateFilter(i, 'key', e.target.value)}
                placeholder="field (e.g. contact.status)"
                className="flex-1 text-sm"
              />
              <Input
                value={f.value}
                onChange={(e) => updateFilter(i, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 text-sm"
              />
              <button
                onClick={() => setFilters((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Button onClick={handleSave} className="flex-1">Save</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </SlideOver>
  );
}
