import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../../data/store';
import type { Design, Room } from '../../data/types';
import { DesignEditor } from '../../editors/DesignEditor';
import { DesignCard } from '../../components/DesignCard';
import { EmptyState } from '../../components/ui';

export function DesignsTab({ room }: { room: Room }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<{ item?: Design } | null>(null);
  const designs = data.designs.filter((d) => d.roomId === room.id);

  return (
    <>
      <div className="toolbar spread">
        <p className="row-sub">{designs.length ? `${designs.filter((d) => d.status === 'Approved').length} of ${designs.length} approved` : ''}</p>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={17} /> Add design
        </button>
      </div>

      {designs.length === 0 ? (
        <EmptyState>No design ideas for this room yet. Add a concept with its style, colours and notes.</EmptyState>
      ) : (
        <div className="design-grid">
          {designs.map((d) => <DesignCard key={d.id} design={d} showRoom={false} onClick={() => setEditing({ item: d })} />)}
        </div>
      )}

      {editing && <DesignEditor design={editing.item} roomId={room.id} onClose={() => setEditing(null)} />}
    </>
  );
}
