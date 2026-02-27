/**
 * ActionConfigPanel — slide-over right panel for configuring a workflow action.
 */
'use client';

import * as React from 'react';
import { SlideOver } from '@crm/ui';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Textarea } from '@crm/ui';
import { Label } from '@crm/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { ExpressionBuilder } from './expression-builder';
import { ActionType } from '@/types/workflow';
import type { Action, ActionConfig, SendEmailConfig, SendSmsConfig, CreateTaskConfig, AddNoteConfig, UpdateContactConfig, MoveOpportunityConfig, WebhookConfig, WaitConfig, BranchConfig } from '@/types/workflow';
import type { Pipeline } from '@crm/types';
import { Plus, Trash2 } from 'lucide-react';

interface ActionConfigPanelProps {
  action: Action | null;
  open: boolean;
  onClose: () => void;
  onSave: (actionId: string, config: ActionConfig, condition: string | null, delayAmount: number | null, delayUnit: string | null) => void;
  pipelines?: Pipeline[];
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function ActionConfigPanel({ action, open, onClose, onSave, pipelines = [] }: ActionConfigPanelProps) {
  const [config, setConfig] = React.useState<Record<string, unknown>>({});
  const [condition, setCondition] = React.useState<string>('');
  const [delayAmount, setDelayAmount] = React.useState<string>('');
  const [delayUnit, setDelayUnit] = React.useState<string>('minutes');
  const [showCondition, setShowCondition] = React.useState(false);
  const [showDelay, setShowDelay] = React.useState(false);

  React.useEffect(() => {
    if (action) {
      setConfig(action.config as unknown as Record<string, unknown>);
      setCondition(action.condition ?? '');
      setDelayAmount(action.delayAmount?.toString() ?? '');
      setDelayUnit(action.delayUnit ?? 'minutes');
      setShowCondition(!!action.condition);
      setShowDelay(!!action.delayAmount);
    }
  }, [action]);

  if (!action) return null;

  const handleSave = () => {
    onSave(
      action.id,
      config as unknown as ActionConfig,
      condition || null,
      delayAmount ? parseInt(delayAmount, 10) : null,
      delayAmount ? delayUnit : null,
    );
    onClose();
  };

  const set = (key: string, val: unknown) => setConfig((prev) => ({ ...prev, [key]: val }));

  const renderConfig = () => {
    switch (action.type) {
      case ActionType.SendEmail: {
        const c = config as Partial<SendEmailConfig>;
        return (
          <div className="space-y-4">
            <FormRow label="To">
              <Input value={c.to ?? ''} onChange={(e) => set('to', e.target.value)} placeholder="{{contact.email}} or email@example.com" />
            </FormRow>
            <FormRow label="Subject">
              <Input value={c.subject ?? ''} onChange={(e) => set('subject', e.target.value)} placeholder="Email subject" />
            </FormRow>
            <FormRow label="Body">
              <Textarea value={c.body ?? ''} onChange={(e) => set('body', e.target.value)} placeholder="Email body..." rows={6} />
            </FormRow>
          </div>
        );
      }

      case ActionType.SendSms: {
        const c = config as Partial<SendSmsConfig>;
        return (
          <div className="space-y-4">
            <FormRow label="To">
              <Input value={c.to ?? ''} onChange={(e) => set('to', e.target.value)} placeholder="{{contact.phone}}" />
            </FormRow>
            <FormRow label="Body">
              <Textarea value={c.body ?? ''} onChange={(e) => set('body', e.target.value)} placeholder="SMS body..." rows={4} maxLength={160} />
              <p className="text-xs text-muted-foreground text-right">{(c.body ?? '').length}/160</p>
            </FormRow>
          </div>
        );
      }

      case ActionType.CreateTask: {
        const c = config as Partial<CreateTaskConfig>;
        return (
          <div className="space-y-4">
            <FormRow label="Title">
              <Input value={c.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Task title" />
            </FormRow>
            <FormRow label="Due Date Offset">
              <Input value={c.dueDateOffset ?? ''} onChange={(e) => set('dueDateOffset', e.target.value)} placeholder="+2 days, +1 week" />
            </FormRow>
            <FormRow label="Assigned User ID (optional)">
              <Input value={c.assignedUserId ?? ''} onChange={(e) => set('assignedUserId', e.target.value)} placeholder="user-id" />
            </FormRow>
          </div>
        );
      }

      case ActionType.AddNote: {
        const c = config as Partial<AddNoteConfig>;
        return (
          <div className="space-y-4">
            <FormRow label="Note Body">
              <Textarea value={c.body ?? ''} onChange={(e) => set('body', e.target.value)} placeholder="Note content..." rows={5} />
            </FormRow>
          </div>
        );
      }

      case ActionType.UpdateContact: {
        const c = config as Partial<UpdateContactConfig>;
        const fields: { field: string; value: string }[] = c.fields ?? [];
        return (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Fields to Update</Label>
            {fields.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={row.field}
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = { ...next[i]!, field: e.target.value };
                    set('fields', next);
                  }}
                  placeholder="field name"
                  className="flex-1"
                />
                <Input
                  value={row.value}
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = { ...next[i]!, value: e.target.value };
                    set('fields', next);
                  }}
                  placeholder="value"
                  className="flex-1"
                />
                <button
                  onClick={() => set('fields', fields.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => set('fields', [...fields, { field: '', value: '' }])}>
              <Plus size={14} className="mr-1" /> Add Field
            </Button>
          </div>
        );
      }

      case ActionType.MoveOpportunity: {
        const c = config as Partial<MoveOpportunityConfig>;
        const pipeline = pipelines.find((p) => p.id === c.pipelineId);
        return (
          <div className="space-y-4">
            <FormRow label="Pipeline">
              <Select value={c.pipelineId ?? ''} onValueChange={(v) => { set('pipelineId', v); set('stageId', ''); }}>
                <SelectTrigger><SelectValue placeholder="Select pipeline" /></SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormRow>
            {pipeline && (
              <FormRow label="Stage">
                <Select value={c.stageId ?? ''} onValueChange={(v) => set('stageId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    {(pipeline as Pipeline & { stages?: { id: string; name: string }[] }).stages?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            )}
          </div>
        );
      }

      case ActionType.Webhook: {
        const c = config as Partial<WebhookConfig>;
        return (
          <div className="space-y-4">
            <FormRow label="Webhook URL">
              <Input value={c.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
            </FormRow>
            <FormRow label="Body (JSON, optional)">
              <Textarea value={c.body ?? ''} onChange={(e) => set('body', e.target.value)} placeholder='{"key": "{{contact.id}}"}' rows={5} className="font-mono text-xs" />
            </FormRow>
          </div>
        );
      }

      case ActionType.Wait: {
        const c = config as Partial<WaitConfig>;
        return (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Wait Duration</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={c.amount?.toString() ?? ''}
                onChange={(e) => set('amount', parseInt(e.target.value, 10) || 1)}
                placeholder="5"
                className="w-24"
              />
              <Select value={c.unit ?? 'minutes'} onValueChange={(v) => set('unit', v)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }

      case ActionType.Branch: {
        const c = config as Partial<BranchConfig>;
        return (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Branch Condition</Label>
            <ExpressionBuilder value={c.expression ?? ''} onChange={(v) => set('expression', v)} />
            <FormRow label="True Path Label">
              <Input value={c.trueLabel ?? 'True'} onChange={(e) => set('trueLabel', e.target.value)} />
            </FormRow>
            <FormRow label="False Path Label">
              <Input value={c.falseLabel ?? 'False'} onChange={(e) => set('falseLabel', e.target.value)} />
            </FormRow>
          </div>
        );
      }

      default:
        return <p className="text-sm text-muted-foreground">No config for this action type.</p>;
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={`Configure: ${action.type.replace(/_/g, ' ')}`}
    >
      <div className="flex flex-col gap-6 p-6 overflow-y-auto">
        {/* Main config */}
        {renderConfig()}

        {/* Condition section (not for branch) */}
        {action.type !== ActionType.Branch && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Condition (optional)</Label>
              <button
                onClick={() => { setShowCondition(!showCondition); if (showCondition) setCondition(''); }}
                className="text-xs text-primary hover:underline"
              >
                {showCondition ? 'Remove' : '+ Add If condition'}
              </button>
            </div>
            {showCondition && (
              <ExpressionBuilder value={condition} onChange={setCondition} />
            )}
          </div>
        )}

        {/* Delay section */}
        {action.type !== ActionType.Wait && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Delay before action</Label>
              <button
                onClick={() => { setShowDelay(!showDelay); if (showDelay) { setDelayAmount(''); } }}
                className="text-xs text-primary hover:underline"
              >
                {showDelay ? 'Remove' : '+ Add delay'}
              </button>
            </div>
            {showDelay && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={delayAmount}
                  onChange={(e) => setDelayAmount(e.target.value)}
                  placeholder="5"
                  className="w-24"
                />
                <Select value={delayUnit} onValueChange={setDelayUnit}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Save */}
        <div className="flex gap-2 border-t pt-4">
          <Button onClick={handleSave} className="flex-1">Save</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </SlideOver>
  );
}
