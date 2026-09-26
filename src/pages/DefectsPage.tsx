import { useState } from 'react';
import { defects, type DefectStatus } from '../data/sampleData';
import { formatDate, roomName } from '../format';
import { href } from '../router';
import { Badge, Chips, EmptyState, PageHeader, statusTone } from '../components/ui';

const filters = ['All', 'Open', 'In progress', 'Resolved'] as const;
const severityRank = { High: 0, Medium: 1, Low: 2 };

export function DefectsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const shown = defects
    .filter((d) => filter === 'All' || d.status === (filter as DefectStatus))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const count = (s: DefectStatus) => defects.filter((d) => d.status === s).length;

  return (
    <>
      <PageHeader eyebrow="Handover checks" title="Defects" subtitle="Issues found during inspection, sorted by priority" />

      <div className="mini-stats">
        <div><strong>{count('Open')}</strong><span>Open</span></div>
        <div><strong>{count('In progress')}</strong><span>In progress</span></div>
        <div><strong>{count('Resolved')}</strong><span>Resolved</span></div>
      </div>

      <Chips options={filters} value={filter} onChange={setFilter} />

      {shown.length === 0 ? (
        <EmptyState>Nothing here. 🎉</EmptyState>
      ) : (
        <div className="stack">
          {shown.map((d) => (
            <article key={d.id} className={`defect sev-${d.severity.toLowerCase()}`}>
              <div className="room-card-top">
                <h3>{d.title}</h3>
                <Badge tone={statusTone[d.status]}>{d.status}</Badge>
              </div>
              <p className="design-notes">{d.description}</p>
              <div className="defect-meta">
                <Badge tone={statusTone[d.severity]}>{d.severity} priority</Badge>
                <a className="link" href={href(`/rooms/${d.roomId}`)}>{roomName(d.roomId)}</a>
                <span className="row-sub">Reported {formatDate(d.reportedOn)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
