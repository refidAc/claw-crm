/**
 * ConditionEvaluator — pure, side-effect-free expression evaluator.
 *
 * Expression format: "<field> <operator> <value>"
 * Examples:
 *   "contact.email contains '@gmail.com'"
 *   "triggerPayload.status equals 'active'"
 *   "opportunity.amount gt 1000"
 *   "contact.phone is_not_empty"
 */

export type WorkflowEvalContext = {
  accountId: string;
  jobId: string;
  triggerPayload: Record<string, unknown>;
  contactData?: Record<string, unknown>;
  opportunityData?: Record<string, unknown>;
};

const OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'gt',
  'lt',
  'is_empty',
  'is_not_empty',
] as const;

type Operator = (typeof OPERATORS)[number];

function resolveField(fieldPath: string, context: WorkflowEvalContext): unknown {
  const parts = fieldPath.split('.');
  const root = parts[0];
  const rest = parts.slice(1);

  let obj: Record<string, unknown> | undefined;
  if (root === 'triggerPayload') {
    obj = context.triggerPayload;
  } else if (root === 'contact') {
    obj = context.contactData ?? {};
  } else if (root === 'opportunity') {
    obj = context.opportunityData ?? {};
  } else {
    return undefined;
  }

  return rest.reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function compareValues(actual: unknown, operator: Operator, expected: string): boolean {
  switch (operator) {
    case 'is_empty':
      return actual === null || actual === undefined || actual === '';
    case 'is_not_empty':
      return actual !== null && actual !== undefined && actual !== '';
    case 'equals':
      return String(actual) === expected;
    case 'not_equals':
      return String(actual) !== expected;
    case 'contains':
      return typeof actual === 'string' && actual.includes(expected);
    case 'not_contains':
      return typeof actual === 'string' && !actual.includes(expected);
    case 'gt': {
      const n = Number(actual);
      return !isNaN(n) && n > Number(expected);
    }
    case 'lt': {
      const n = Number(actual);
      return !isNaN(n) && n < Number(expected);
    }
    default:
      return false;
  }
}

/**
 * Parse and evaluate a single expression string.
 * Returns true if the condition passes, false otherwise.
 * Never throws — invalid expressions evaluate to false.
 */
export function evaluateExpression(expression: string, context: WorkflowEvalContext): boolean {
  try {
    // Detect unary operators first (no value part)
    for (const op of ['is_empty', 'is_not_empty'] as const) {
      if (expression.trim().endsWith(` ${op}`)) {
        const field = expression.trim().slice(0, -(op.length + 1)).trim();
        const actual = resolveField(field, context);
        return compareValues(actual, op, '');
      }
    }

    // Binary: "<field> <operator> <value>"
    for (const op of OPERATORS) {
      const marker = ` ${op} `;
      const idx = expression.indexOf(marker);
      if (idx !== -1) {
        const field = expression.slice(0, idx).trim();
        const rawValue = expression.slice(idx + marker.length).trim();
        // Strip surrounding quotes if present
        const value = rawValue.replace(/^['"]|['"]$/g, '');
        const actual = resolveField(field, context);
        return compareValues(actual, op as Operator, value);
      }
    }

    return false;
  } catch {
    return false;
  }
}
