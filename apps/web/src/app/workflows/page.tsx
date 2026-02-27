/**
 * Workflows List Page — table of workflows with activation toggles and actions.
 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { Badge } from '@crm/ui';
import { Switch } from '@crm/ui';
import { Skeleton } from '@crm/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@crm/ui';
import { Input } from '@crm/ui';
import { Textarea } from '@crm/ui';
import { Label } from '@crm/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@crm/ui';
import { Zap, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { ToastProvider, useToast } from '@/components/pipelines/toast';
import {
  getWorkflows,
  createWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
} from '@/lib/api';
import type { Workflow } from '@/types/workflow';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function WorkflowsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Workflow | null>(null);
  const [toggling, setToggling] = React.useState<Set<string>>(new Set());

  // Create modal state
  const [newName, setNewName] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await getWorkflows();
      setWorkflows(data);
    } catch (e) {
      toast((e as Error).message ?? 'Failed to load workflows', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const wf = await createWorkflow({ name: newName.trim(), description: newDesc.trim() || undefined });
      setWorkflows((prev) => [wf, ...prev]);
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      toast('Workflow created', 'success');
      router.push(`/workflows/${wf.id}`);
    } catch (e) {
      toast((e as Error).message ?? 'Failed to create workflow', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (wf: Workflow) => {
    setToggling((prev) => new Set(prev).add(wf.id));
    // Optimistic
    setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, isActive: !w.isActive } : w));
    try {
      const updated = wf.isActive ? await deactivateWorkflow(wf.id) : await activateWorkflow(wf.id);
      setWorkflows((prev) => prev.map((w) => w.id === wf.id ? updated : w));
      toast(`Workflow ${updated.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch (e) {
      // Revert
      setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, isActive: wf.isActive } : w));
      toast((e as Error).message ?? 'Failed to update workflow', 'error');
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(wf.id); return s; });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflow(deleteTarget.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      toast('Workflow deleted', 'success');
    } catch (e) {
      toast((e as Error).message ?? 'Failed to delete workflow', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1">Automate actions based on CRM events.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" /> New Workflow
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Zap size={40} className="text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">No workflows yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first workflow to start automating.</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} className="mr-2" /> New Workflow
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Triggers</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{wf.name}</p>
                      {wf.description && <p className="text-xs text-muted-foreground">{wf.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={wf.isActive}
                      onCheckedChange={() => handleToggle(wf)}
                      disabled={toggling.has(wf.id)}
                      aria-label={`Toggle ${wf.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{wf._count?.triggers ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {wf.lastRunAt ? formatDate(wf.lastRunAt) : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatDate(wf.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/workflows/${wf.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil size={13} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(wf)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={(o) => { if (!o) { setShowCreateModal(false); setNewName(''); setNewDesc(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Welcome new contact"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this workflow do?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-destructive" />
              Delete Workflow
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <ToastProvider>
      <WorkflowsContent />
    </ToastProvider>
  );
}
