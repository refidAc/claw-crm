/**
 * RunHistoryPanel — shows paginated run history for a workflow.
 */
'use client';

import * as React from 'react';
import { Badge } from '@crm/ui';
import { Skeleton } from '@crm/ui';
import { Button } from '@crm/ui';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import type { JobRun, ActionStepResult } from '@/types/workflow';
import { JobRunStatus } from '@/types/workflow';
import { getWorkflowRuns } from '@/lib/api';

interface RunHistoryPanelProps {
  workflowId: string;
}

function StatusBadge({ status }: { status: JobRunStatus }) {
  const map: Record<JobRunStatus, { variant: 'default' | 'success' | 'destructive' | 'warning'; label: string }> = {
    [JobRunStatus.Completed]: { variant: 'success', label: 'Completed' },
    [JobRunStatus.Failed]: { variant: 'destructive', label: 'Failed' },
    [JobRunStatus.Running]: { variant: 'default', label: 'Running' },
    [JobRunStatus.Waiting]: { variant: 'warning', label: 'Waiting' },
  };
  const { variant, label } = map[status] ?? { variant: 'default', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

function StepResultRow({ step }: { step: ActionStepResult }) {
  const Icon = step.status === 'completed' ? CheckCircle2 : step.status === 'skipped' ? Clock : XCircle;
  const color = step.status === 'completed' ? 'text-green-600' : step.status === 'skipped' ? 'text-yellow-600' : 'text-red-600';
  return (
    <div className="flex items-start gap-2 text-xs py-1 pl-4 border-l-2 border-muted ml-2">
      <Icon size={12} className={`mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{step.actionType.replace(/_/g, ' ')}</span>
        <span className={`ml-2 ${color}`}>{step.status}</span>
        {step.error && <p className="text-destructive mt-0.5 break-words">{step.error}</p>}
      </div>
    </div>
  );
}

function RunRow({ run }: { run: JobRun }) {
  const [expanded, setExpanded] = React.useState(false);

  const duration = run.durationMs != null
    ? run.durationMs < 1000 ? `${run.durationMs}ms` : `${(run.durationMs / 1000).toFixed(1)}s`
    : null;

  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={run.status} />
            {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(run.triggeredAt).toLocaleString()}
          </p>
        </div>
      </button>

      {expanded && run.stepResults && run.stepResults.length > 0 && (
        <div className="pb-2 px-3 space-y-0.5">
          {run.stepResults.map((step, i) => (
            <StepResultRow key={i} step={step} />
          ))}
        </div>
      )}
      {expanded && run.error && (
        <p className="text-xs text-destructive px-5 pb-2">{run.error}</p>
      )}
    </div>
  );
}

export function RunHistoryPanel({ workflowId }: RunHistoryPanelProps) {
  const [runs, setRuns] = React.useState<JobRun[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | undefined>();
  const [hasMore, setHasMore] = React.useState(true);

  const PAGE_SIZE = 10;

  const fetchRuns = React.useCallback(async (reset = false) => {
    try {
      const c = reset ? undefined : cursor;
      const data = await getWorkflowRuns(workflowId, c);
      if (reset) {
        setRuns(data);
      } else {
        setRuns((prev) => [...prev, ...data]);
      }
      setHasMore(data.length >= PAGE_SIZE);
      if (data.length > 0) {
        setCursor(data[data.length - 1]!.id);
      }
    } catch {
      // silently fail — toast handled at page level
    }
  }, [workflowId, cursor]);

  React.useEffect(() => {
    setLoading(true);
    fetchRuns(true).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchRuns(false);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Clock size={24} className="text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No runs yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Runs appear here when the workflow fires.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {runs.map((run) => <RunRow key={run.id} run={run} />)}
      </div>
      {hasMore && (
        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
