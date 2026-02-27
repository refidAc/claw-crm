/**
 * /pipelines — list all pipelines, create new ones.
 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, GitBranch, ChevronRight, LayoutKanban } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Label, Skeleton } from '@crm/ui';
import type { Pipeline } from '@crm/types';
import { getPipelines, createPipeline } from '@/lib/api';
import { ToastProvider, useToast } from '@/components/pipelines/toast';

function formatCurrency(value: number): string {
  if (value === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? 'compact' : 'standard',
  }).format(value);
}

function PipelineListContent() {
  const { toast } = useToast();
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    getPipelines()
      .then(setPipelines)
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load pipelines', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const pipeline = await createPipeline({ name: newName.trim() });
      setPipelines((prev) => [...prev, pipeline]);
      setModalOpen(false);
      setNewName('');
      toast('Pipeline created', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create pipeline', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutKanban className="h-6 w-6 text-primary" />
            Pipelines
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your sales pipelines and track opportunities</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Pipeline
        </Button>
      </div>

      {/* Pipeline grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl">
          <GitBranch className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No pipelines yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first pipeline to start tracking opportunities</p>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines.map((pipeline) => {
            const stageCount = pipeline._count?.stages ?? pipeline.stages?.length ?? 0;
            const oppCount = pipeline._count?.opportunities ?? pipeline.opportunities?.length ?? 0;
            const totalValue = pipeline.opportunities?.reduce((sum, o) => {
              return sum + (o.value != null ? parseFloat(String(o.value)) : 0);
            }, 0) ?? 0;

            return (
              <Link
                key={pipeline.id}
                href={`/pipelines/${pipeline.id}`}
                className="group block bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                <h3 className="font-semibold text-base mb-1 truncate">{pipeline.name}</h3>

                <div className="flex gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Stages</p>
                    <p className="font-medium">{stageCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Opportunities</p>
                    <p className="font-medium">{oppCount}</p>
                  </div>
                  {totalValue > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="font-medium text-green-600">{formatCurrency(totalValue)}</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create pipeline modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pipeline</DialogTitle>
            <DialogDescription>Give your pipeline a name to get started.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="py-4 space-y-3">
              <Label htmlFor="pipeline-name">Pipeline Name</Label>
              <Input
                id="pipeline-name"
                placeholder="e.g. Sales Pipeline"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? 'Creating…' : 'Create Pipeline'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PipelinesPage() {
  return (
    <ToastProvider>
      <PipelineListContent />
    </ToastProvider>
  );
}
