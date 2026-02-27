/**
 * NewOpportunitySheet — slide-over form for creating a new opportunity.
 */
'use client';

import * as React from 'react';
import { SlideOver, Button, Input, Label, CurrencyInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import type { Contact, Stage } from '@crm/types';
import { getContacts, createOpportunity } from '@/lib/api';
import type { NewOpportunityFormData } from '@/types/pipeline';
import { useToast } from './toast';

interface NewOpportunitySheetProps {
  open: boolean;
  onClose: () => void;
  pipelineId: string;
  stages: Stage[];
  defaultStageId: string;
  onCreated: (opp: import('@crm/types').Opportunity) => void;
}

export function NewOpportunitySheet({
  open,
  onClose,
  pipelineId,
  stages,
  defaultStageId,
  onCreated,
}: NewOpportunitySheetProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const [form, setForm] = React.useState<NewOpportunityFormData>({
    title: '',
    contactId: '',
    value: null,
    closedAt: '',
    stageId: defaultStageId,
    pipelineId,
  });

  React.useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, stageId: defaultStageId, pipelineId }));
    }
  }, [open, defaultStageId, pipelineId]);

  // Load contacts (debounced search)
  React.useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const results = await getContacts(contactSearch || undefined);
        setContacts(results);
      } catch {
        // Silently ignore — contacts are optional search
      }
    }, 300);
    return () => clearTimeout(id);
  }, [contactSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast('Title is required', 'error');
    if (!form.contactId) return toast('Contact is required', 'error');
    if (!form.stageId) return toast('Stage is required', 'error');

    setSubmitting(true);
    try {
      const opp = await createOpportunity({
        title: form.title,
        contactId: form.contactId,
        pipelineId: form.pipelineId,
        stageId: form.stageId,
        value: form.value,
        closedAt: form.closedAt || null,
      });
      toast('Opportunity created', 'success');
      onCreated(opp);
      onClose();
      setForm({ title: '', contactId: '', value: null, closedAt: '', stageId: defaultStageId, pipelineId });
      setContactSearch('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create opportunity', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title="New Opportunity" width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-title">Title *</Label>
          <Input
            id="opp-title"
            placeholder="e.g. Website Redesign"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>

        {/* Stage */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-stage">Stage *</Label>
          <Select value={form.stageId} onValueChange={(v) => setForm((f) => ({ ...f, stageId: v }))}>
            <SelectTrigger id="opp-stage">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contact search */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-contact-search">Contact *</Label>
          <Input
            id="opp-contact-search"
            placeholder="Search contacts…"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
          />
          {contacts.length > 0 && (
            <div className="border border-border rounded-md shadow-sm max-h-48 overflow-y-auto">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${form.contactId === c.id ? 'bg-accent font-medium' : ''}`}
                  onClick={() => {
                    setForm((f) => ({ ...f, contactId: c.id }));
                    setContactSearch(`${c.firstName} ${c.lastName}`);
                    setContacts([]);
                  }}
                >
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                  {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
                </button>
              ))}
            </div>
          )}
          {form.contactId && (
            <p className="text-xs text-green-600">✓ Contact selected</p>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-value">Value</Label>
          <CurrencyInput
            id="opp-value"
            value={form.value}
            onChange={(v) => setForm((f) => ({ ...f, value: v }))}
            placeholder="0.00"
          />
        </div>

        {/* Close date */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-close-date">Expected Close Date</Label>
          <Input
            id="opp-close-date"
            type="date"
            value={form.closedAt}
            onChange={(e) => setForm((f) => ({ ...f, closedAt: e.target.value }))}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Opportunity'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
