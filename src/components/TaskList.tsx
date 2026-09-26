import { useState } from 'react';
import { Check } from 'lucide-react';
import { useRoomName, useStore } from '../data/store';
import type { Task } from '../data/types';
import { daysUntil, formatDate } from '../format';
import { TaskEditor } from '../editors/TaskEditor';
import { EmptyState } from './ui';

/** Upcoming tasks with tick boxes. Tap a task to edit it. */
export function TaskList({ roomId }: { roomId?: string }) {
  const { data, upsert, notify } = useStore();
  const roomName = useRoomName();
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);

  const tasks = data.tasks.filter((t) => roomId === undefined || t.roomId === roomId).sort((a, b) => a.due.localeCompare(b.due));
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const shown = showDone ? [...open, ...done] : open;

  const toggle = (t: Task) => {
    upsert('tasks', { ...t, done: !t.done });
    notify(t.done ? 'Task reopened' : 'Task done');
  };

  return (
    <>
      {shown.length === 0 ? (
        <EmptyState>{done.length ? 'All tasks done. 🎉' : 'No tasks yet.'}</EmptyState>
      ) : (
        <ul className="list">
          {shown.map((t) => {
            const overdue = !t.done && daysUntil(t.due) < 0;
            return (
              <li key={t.id} className={`list-row ${t.done ? 'is-done' : ''}`}>
                <button type="button" className={`check ${t.done ? 'checked' : ''}`} onClick={() => toggle(t)} aria-label={t.done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}>
                  {t.done && <Check size={14} strokeWidth={3} />}
                </button>
                <button type="button" className="row-button grow" onClick={() => setEditing(t)}>
                  <p className="row-title">{t.title}</p>
                  <p className="row-sub">
                    <span className={overdue ? 'overdue' : ''}>{overdue ? 'Overdue · ' : ''}{formatDate(t.due, { day: 'numeric', month: 'short' })}</span>
                    {roomId === undefined && ` · ${roomName(t.roomId)}`}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {done.length > 0 && (
        <button type="button" className="text-btn" onClick={() => setShowDone((s) => !s)}>
          {showDone ? 'Hide completed' : `Show ${done.length} completed`}
        </button>
      )}
      {editing && <TaskEditor task={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
