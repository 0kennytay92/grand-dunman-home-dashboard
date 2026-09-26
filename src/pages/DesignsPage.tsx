import { useState } from 'react';
import { useStore } from '../data/store';
import { DesignCard } from '../components/DesignCard';
import type { Design, DesignStatus } from '../data/types';
import { AddButton } from '../components/forms';
import { DesignEditor } from '../editors/DesignEditor';
import { Chips, EmptyState, PageHeader } from '../components/ui';

const filters = ['All', 'Draft', 'Under review', 'Approved'] as const;

export function DesignsPage() {
  const { designs } = useStore().data;
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [editing, setEditing] = useState<{ item?: Design } | null>(null);
  const shown = filter === 'All' ? designs : designs.filter((d) => d.status === (filter as DesignStatus));

  return (
    <>
      <PageHeader
        eyebrow="Look & feel"
        title="Interior Designs"
        subtitle={`${designs.filter((d) => d.status === 'Approved').length} of ${designs.length} concepts approved`}
        action={<AddButton label="Add design" onClick={() => setEditing({})} />}
      />
      <Chips options={filters} value={filter} onChange={setFilter} />

      {shown.length === 0 ? (
        <EmptyState>{designs.length ? 'No designs with this status.' : 'No designs yet. Tap "Add design" to start.'}</EmptyState>
      ) : (
        <div className="design-grid">
          {shown.map((d) => <DesignCard key={d.id} design={d} onClick={() => setEditing({ item: d })} />)}
        </div>
      )}

      {editing && <DesignEditor design={editing.item} onClose={() => setEditing(null)} />}
    </>
  );
}
