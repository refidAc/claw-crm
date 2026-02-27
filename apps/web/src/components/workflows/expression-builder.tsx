/**
 * ExpressionBuilder — visual editor for a single condition expression.
 * Serializes to: `"contact.email contains '@gmail.com'"`
 */
'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { Input } from '@crm/ui';
import { ConditionOperator } from '@/types/workflow';

const FIELD_GROUPS = [
  {
    group: 'triggerPayload',
    label: 'Trigger Payload',
    fields: ['triggerPayload.id', 'triggerPayload.type', 'triggerPayload.timestamp'],
  },
  {
    group: 'contact',
    label: 'Contact',
    fields: [
      'contact.id',
      'contact.email',
      'contact.phone',
      'contact.firstName',
      'contact.lastName',
      'contact.tags',
      'contact.status',
    ],
  },
  {
    group: 'opportunity',
    label: 'Opportunity',
    fields: [
      'opportunity.id',
      'opportunity.title',
      'opportunity.value',
      'opportunity.status',
      'opportunity.stageId',
      'opportunity.pipelineId',
    ],
  },
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

const OPERATORS: { value: ConditionOperator; label: string; noValue?: boolean }[] = [
  { value: ConditionOperator.Equals, label: 'equals' },
  { value: ConditionOperator.NotEquals, label: 'not equals' },
  { value: ConditionOperator.Contains, label: 'contains' },
  { value: ConditionOperator.NotContains, label: 'not contains' },
  { value: ConditionOperator.Gt, label: 'greater than' },
  { value: ConditionOperator.Lt, label: 'less than' },
  { value: ConditionOperator.IsEmpty, label: 'is empty', noValue: true },
  { value: ConditionOperator.IsNotEmpty, label: 'is not empty', noValue: true },
];

/** Parse `"field operator 'value'"` or `"field operator"` back to parts */
export function parseExpression(expr: string): { field: string; operator: ConditionOperator; value: string } {
  const trimmed = expr.trim();
  for (const op of OPERATORS) {
    const pattern = op.noValue
      ? new RegExp(`^(.+?)\\s+${op.value}\\s*$`)
      : new RegExp(`^(.+?)\\s+${op.value}\\s+'(.*)'$`);
    const m = trimmed.match(pattern);
    if (m) {
      return { field: m[1]?.trim() ?? '', operator: op.value, value: m[2] ?? '' };
    }
  }
  // fallback
  return { field: '', operator: ConditionOperator.Equals, value: '' };
}

/** Serialize parts to expression string */
export function serializeExpression(field: string, operator: ConditionOperator, value: string): string {
  const op = OPERATORS.find((o) => o.value === operator);
  if (!op) return '';
  if (op.noValue) return `${field} ${operator}`;
  return `${field} ${operator} '${value}'`;
}

interface ExpressionBuilderProps {
  value: string;
  onChange: (expr: string) => void;
}

export function ExpressionBuilder({ value, onChange }: ExpressionBuilderProps) {
  const parsed = React.useMemo(() => parseExpression(value), [value]);

  const [field, setField] = React.useState(parsed.field || ALL_FIELDS[0] || '');
  const [operator, setOperator] = React.useState<ConditionOperator>(parsed.operator);
  const [val, setVal] = React.useState(parsed.value);

  // Sync back when parent value changes externally
  React.useEffect(() => {
    const p = parseExpression(value);
    setField(p.field || ALL_FIELDS[0] || '');
    setOperator(p.operator);
    setVal(p.value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = React.useCallback(
    (f: string, op: ConditionOperator, v: string) => {
      onChange(serializeExpression(f, op, v));
    },
    [onChange],
  );

  const handleField = (f: string) => { setField(f); emit(f, operator, val); };
  const handleOperator = (op: ConditionOperator) => { setOperator(op); emit(field, op, val); };
  const handleValue = (v: string) => { setVal(v); emit(field, operator, v); };

  const currentOp = OPERATORS.find((o) => o.value === operator);

  return (
    <div className="space-y-2">
      {/* Field */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Field</label>
        <Select value={field} onValueChange={handleField}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_GROUPS.map((g) => (
              <React.Fragment key={g.group}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {g.label}
                </div>
                {g.fields.map((f) => (
                  <SelectItem key={f} value={f} className="pl-4 text-sm">
                    {f}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Operator */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Operator</label>
        <Select value={operator} onValueChange={(v) => handleOperator(v as ConditionOperator)}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-sm">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value — hidden for is_empty / is_not_empty */}
      {!currentOp?.noValue && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Value</label>
          <Input
            value={val}
            onChange={(e) => handleValue(e.target.value)}
            placeholder="Enter value..."
            className="text-sm"
          />
        </div>
      )}

      {/* Preview */}
      {field && (
        <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 mt-1">
          {serializeExpression(field, operator, val)}
        </p>
      )}
    </div>
  );
}
