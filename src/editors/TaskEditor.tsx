import { useState } from 'react';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import type { Task } from '../data/types';
import { DateInput, EditorModal, SelectInput, TextInput } from '../components/forms';

export function TaskEditor({ task, roomId, onClose }: { task?: Task; roomId?: string; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.due ?? todayIso());
  const [room, setRoom] = useState(task?.roomId ?? roomId ?? '');
  const [done, setDone] = useState(task?.done ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'What needs doing?';
    if (!due) e.due = 'Pick a due date.';
    setErrors(e);
    if (Object.keys(e).length) return;

    upsert('tasks', { id: task?.id ?? newId(), title: title.trim(), due, roomId: room || undefined, done });
    notify(task ? 'Task updated' : 'Task added');
    onClose();
  };

  const del = () => {
    if (!task || !window.confirm(`Delete "${task.title}"?`)) return;
    remove('tasks', task.id);
    notify('Task deleted');
    onClose();
  };

  return (
    <EditorModal title={task ? 'Edit task' : 'Add task'} onClose={onClose} onSave={save} onDelete={task ? del : undefined}>
      <TextInput label="Task" value={title} onChange={setTitle} error={errors.title} placeholder="e.g. Confirm tile colour" autoFocus={!task} />
      <DateInput label="Due date" value={due} onChange={setDue} error={errors.due} />
      <SelectInput label="Room" value={room} onChange={setRoom} options={[{ value: '', label: 'Whole home' }, ...data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))]} />
      {task && (
        <label className="checkbox-line">
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} /> Done
        </label>
      )}
    </EditorModal>
  );
}
