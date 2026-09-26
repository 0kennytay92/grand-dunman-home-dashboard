import { useState } from 'react';
import { designs, type DesignStatus } from '../data/sampleData';
import { roomName } from '../format';
import { href } from '../router';
import { Badge, Chips, EmptyState, PageHeader, statusTone } from '../components/ui';

const filters = ['All', 'Draft', 'Under review', 'Approved'] as const;

export function DesignsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const shown = filter === 'All' ? designs : designs.filter((d) => d.status === (filter as DesignStatus));

  return (
    <>
      <PageHeader eyebrow="Look & feel" title="Interior Designs" subtitle={`${designs.filter((d) => d.status === 'Approved').length} of ${designs.length} concepts approved`} />
      <Chips options={filters} value={filter} onChange={setFilter} />

      {shown.length === 0 ? (
        <EmptyState>No designs with this status.</EmptyState>
      ) : (
        <div className="design-grid">
          {shown.map((d) => (
            <article key={d.id} className="design-card">
              <div className="palette">
                {d.palette.map((c) => <span key={c} style={{ background: c }} title={c} />)}
              </div>
              <div className="design-body">
                <div className="room-card-top">
                  <div>
                    <p className="eyebrow">{d.style}</p>
                    <h3>{d.title}</h3>
                  </div>
                  <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                </div>
                <p className="design-notes">{d.notes}</p>
                <p className="row-sub">
                  <a className="link" href={href(`/rooms/${d.roomId}`)}>{roomName(d.roomId)}</a> · {d.designer}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
