import { useState } from 'react';
import { DoorOpen, ListChecks, Wallet, ChevronRight, Gauge, Plus } from 'lucide-react';
import { useBudgetTotals, useRoomName, useStore } from '../data/store';
import { daysUntil, formatDate, money } from '../format';
import { href } from '../router';
import { navItems } from '../components/Layout';
import { TaskList } from '../components/TaskList';
import { TaskEditor } from '../editors/TaskEditor';
import { ExpenseEditor } from '../editors/ExpenseEditor';
import { Badge, Card, EmptyState, ProgressBar, Stat, statusTone } from '../components/ui';

export function HomePage() {
  const { data } = useStore();
  const { project, rooms, expenses, designs, tasks } = data;
  const roomName = useRoomName();
  const { totalBudget, totalSpent } = useBudgetTotals();
  const [adding, setAdding] = useState<'task' | 'payment' | null>(null);

  const totalArea = rooms.reduce((s, r) => s + r.areaSqm, 0);
  const overall = rooms.length === 0 ? 0 : Math.round(
    totalArea > 0
      ? rooms.reduce((s, r) => s + r.progress * r.areaSqm, 0) / totalArea
      : rooms.reduce((s, r) => s + r.progress, 0) / rooms.length,
  );
  const inProgressRooms = rooms.filter((r) => r.status === 'In progress');
  const openTasks = tasks.filter((t) => !t.done);
  const overdue = openTasks.filter((t) => daysUntil(t.due) < 0).length;
  const pendingDesigns = designs.filter((d) => d.status !== 'Approved');
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const moveInDays = daysUntil(project.targetMoveIn);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Welcome home</p>
          <h1>{project.name}</h1>
          <p className="hero-sub">Renovation in progress · target move-in {formatDate(project.targetMoveIn)}</p>
        </div>
        <div className="hero-count">
          <span className="hero-count-num">{Math.max(moveInDays, 0)}</span>
          <span>days to move-in</span>
        </div>
      </section>

      <div className="stats-grid">
        <Stat icon={<Gauge size={18} />} label="Overall progress" value={`${overall}%`} hint={`${inProgressRooms.length} rooms under works`} />
        <Stat icon={<Wallet size={18} />} label="Budget used" value={money(totalSpent)} hint={`of ${money(totalBudget)}`} />
        <Stat icon={<ListChecks size={18} />} label="Tasks to do" value={String(openTasks.length)} hint={overdue ? `${overdue} overdue` : 'None overdue'} />
        <Stat icon={<DoorOpen size={18} />} label="Rooms" value={String(rooms.length)} hint={`${rooms.filter((r) => r.status === 'Completed').length} completed`} />
      </div>

      <div className="grid-2">
        <Card title="Coming up" action={<button className="link" onClick={() => setAdding('task')}><Plus size={15} /> Add task</button>}>
          <TaskList />
        </Card>

        <Card title="Rooms under works" action={<a className="link" href={href('/rooms')}>All rooms <ChevronRight size={15} /></a>}>
          {inProgressRooms.length === 0 ? (
            <EmptyState>No rooms marked "In progress".</EmptyState>
          ) : (
            <ul className="list">
              {inProgressRooms.map((r) => (
                <li key={r.id}>
                  <a className="list-row" href={href(`/rooms/${r.id}`)}>
                    <div className="grow">
                      <p className="row-title">{roomName(r.id)}</p>
                      <ProgressBar value={r.progress} />
                    </div>
                    <span className="row-meta">{r.progress}%</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent spending" action={<button className="link" onClick={() => setAdding('payment')}><Plus size={15} /> Add payment</button>}>
          {recent.length === 0 ? (
            <EmptyState>No payments yet.</EmptyState>
          ) : (
            <ul className="list">
              {recent.map((e) => (
                <li key={e.id} className="list-row">
                  <div className="grow">
                    <p className="row-title">{e.description}</p>
                    <p className="row-sub">{[e.vendor, formatDate(e.date)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="row-amount">{money(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <a className="link card-foot-link" href={href('/budget')}>See full budget <ChevronRight size={15} /></a>
        </Card>

        <Card title="Designs awaiting approval" action={<a className="link" href={href('/designs')}>All designs <ChevronRight size={15} /></a>}>
          {pendingDesigns.length === 0 ? (
            <EmptyState>All designs approved.</EmptyState>
          ) : (
            <ul className="list">
              {pendingDesigns.slice(0, 4).map((d) => (
                <li key={d.id} className="list-row">
                  <div className="swatches small">
                    {d.palette.map((c, i) => <span key={i} style={{ background: c }} />)}
                  </div>
                  <div className="grow">
                    <p className="row-title">{d.title}</p>
                    <p className="row-sub">{roomName(d.roomId)}</p>
                  </div>
                  <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="section-title">Quick access</h2>
      <div className="quick-grid">
        {navItems.slice(1).map(({ path, label, icon: Icon }) => (
          <a key={path} className="quick" href={href(path)}>
            <Icon size={22} strokeWidth={1.6} />
            <span>{label}</span>
          </a>
        ))}
      </div>

      {adding === 'task' && <TaskEditor onClose={() => setAdding(null)} />}
      {adding === 'payment' && <ExpenseEditor onClose={() => setAdding(null)} />}
    </>
  );
}
